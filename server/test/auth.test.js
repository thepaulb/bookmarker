import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import app from "../app.js";
import { db, seedUser, authCookie } from "./helpers.js";

// A real bcrypt hash of "correct-horse" for login tests. Hashed once.
let HASH;
beforeAll(async () => {
  HASH = await bcrypt.hash("correct-horse", 12);
});

// Pull the value of the `token` cookie out of a Set-Cookie header array.
function tokenCookie(res) {
  const cookies = res.headers["set-cookie"] || [];
  return cookies.find((c) => c.startsWith("token="));
}

describe("GET /api/auth/status", () => {
  it("reports that setup is needed when there are no users", async () => {
    const res = await request(app).get("/api/auth/status");
    expect(res.body).toEqual({ needsSetup: true });
  });

  it("reports no setup needed once a user exists", async () => {
    seedUser("paul");
    const res = await request(app).get("/api/auth/status");
    expect(res.body).toEqual({ needsSetup: false });
  });
});

describe("POST /api/auth/register", () => {
  it("creates the first user and sets an httpOnly token cookie", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "paul", password: "long-enough" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ username: "paul" });

    const cookie = tokenCookie(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);

    const row = db.prepare("SELECT * FROM users WHERE username = ?").get("paul");
    expect(row.password_hash).not.toBe("long-enough");
    expect(await bcrypt.compare("long-enough", row.password_hash)).toBe(true);
  });

  it("is closed once a user exists (403)", async () => {
    seedUser("existing");
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "second", password: "long-enough" });
    expect(res.status).toBe(403);
  });

  it("requires both username and password (400)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "nopassword" });
    expect(res.status).toBe(400);
  });

  it("rejects short passwords (400)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "paul", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8/);
  });

  it("rejects non-string credentials (400)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: ["paul"], password: 12345678 });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("returns the username and a cookie on valid credentials", async () => {
    seedUser("paul", HASH);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "paul", password: "correct-horse" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: "paul" });

    const token = tokenCookie(res).split(";")[0].slice("token=".length);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    expect(payload.username).toBe("paul");
  });

  it("rejects a wrong password (401) and sets no cookie", async () => {
    seedUser("paul", HASH);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "paul", password: "wrong" });
    expect(res.status).toBe(401);
    expect(tokenCookie(res)).toBeUndefined();
  });

  it("rejects an unknown user (401)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "ghost", password: "whatever1" });
    expect(res.status).toBe(401);
  });

  it("requires credentials (400)", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the signed-in user", async () => {
    const user = seedUser("paul");
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", authCookie(user));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: "paul" });
  });

  it("is 401 without a cookie", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("is 401 with a tampered token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "token=not.a.jwt");
    expect(res.status).toBe(401);
  });

  it("is 401 with a token signed by another secret", async () => {
    const forged = jwt.sign({ id: 1, username: "paul" }, "other-secret");
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `token=${forged}`);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the token cookie", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(tokenCookie(res)).toMatch(/token=;/);
  });
});

describe("POST /api/auth/create-user", () => {
  it("lets a signed-in user create another account", async () => {
    const admin = seedUser("paul");
    const res = await request(app)
      .post("/api/auth/create-user")
      .set("Cookie", authCookie(admin))
      .send({ username: "alex", password: "long-enough" });

    expect(res.status).toBe(201);
    expect(res.body.username).toBe("alex");
  });

  it("requires authentication (401)", async () => {
    const res = await request(app)
      .post("/api/auth/create-user")
      .send({ username: "alex", password: "long-enough" });
    expect(res.status).toBe(401);
  });

  it("rejects a taken username (409)", async () => {
    const admin = seedUser("paul");
    const res = await request(app)
      .post("/api/auth/create-user")
      .set("Cookie", authCookie(admin))
      .send({ username: "paul", password: "long-enough" });
    expect(res.status).toBe(409);
  });

  it("validates the password (400)", async () => {
    const admin = seedUser("paul");
    const res = await request(app)
      .post("/api/auth/create-user")
      .set("Cookie", authCookie(admin))
      .send({ username: "alex", password: "short" });
    expect(res.status).toBe(400);
  });
});
