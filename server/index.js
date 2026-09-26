// Load env before requiring app (and, through it, the db) so config like
// JWT_SECRET and DB_PATH is in place.
require("dotenv").config({ quiet: true });

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error("JWT_SECRET must be set in production. See .env.example.");
    process.exit(1);
  }
  process.env.JWT_SECRET = "dev-only-insecure-secret";
  console.warn("JWT_SECRET not set — using an insecure development secret.");
}

const app = require("./app");

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
