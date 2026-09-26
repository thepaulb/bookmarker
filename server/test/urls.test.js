import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normaliseUrl, titleFromUrl, resolveTitle } = require("../lib/urls");

describe("normaliseUrl", () => {
  it("accepts http and https URLs", () => {
    expect(normaliseUrl("https://example.com/a?b=1")).toBe(
      "https://example.com/a?b=1",
    );
    expect(normaliseUrl("http://example.com/")).toBe("http://example.com/");
  });

  it("canonicalises so equivalent URLs compare equal", () => {
    expect(normaliseUrl("http://bbc.co.uk")).toBe("http://bbc.co.uk/");
    expect(normaliseUrl("  HTTPS://Example.COM/Path  ")).toBe(
      "https://example.com/Path",
    );
  });

  it("assumes https when the scheme is missing", () => {
    expect(normaliseUrl("bbc.co.uk/news")).toBe("https://bbc.co.uk/news");
  });

  it("allows localhost", () => {
    expect(normaliseUrl("http://localhost:3000/x")).toBe(
      "http://localhost:3000/x",
    );
  });

  it.each([
    ["empty string", ""],
    ["whitespace", "   "],
    ["non-string", 42],
    ["null", null],
    ["javascript scheme", "javascript:alert(1)"],
    ["ftp scheme", "ftp://example.com/file"],
    ["data scheme", "data:text/html,hi"],
    ["single-word host", "https://intranet"],
    ["unparseable", "http://exa mple.com"],
  ])("rejects %s", (_label, input) => {
    expect(normaliseUrl(input)).toBeNull();
  });

  it("rejects URLs over 2048 characters", () => {
    expect(normaliseUrl(`https://example.com/${"a".repeat(2100)}`)).toBeNull();
  });

  describe("tracking parameters", () => {
    it("strips utm_* parameters, keeping real ones", () => {
      expect(
        normaliseUrl(
          "https://example.com/post?id=7&utm_source=news&utm_medium=email&UTM_Campaign=x",
        ),
      ).toBe("https://example.com/post?id=7");
    });

    it("drops the query string entirely when only tracking remains", () => {
      expect(
        normaliseUrl("https://mbrizic.com/blog/react-is-insane/?utm_source=tldrwebdev"),
      ).toBe("https://mbrizic.com/blog/react-is-insane/");
    });

    it("strips identifiers such as TED's user_email_address", () => {
      expect(
        normaliseUrl(
          "https://www.ted.com/talks/dan_pink?user_email_address=4b0dc23c&lctg=62d1",
        ),
      ).toBe("https://www.ted.com/talks/dan_pink");
    });

    it.each(["fbclid", "gclid", "mc_cid", "mc_eid", "_hsenc", "mkt_tok", "igshid"])(
      "strips %s",
      (param) => {
        expect(normaliseUrl(`https://example.com/a?${param}=abc`)).toBe(
          "https://example.com/a",
        );
      },
    );

    it("strips YouTube share tracking but keeps the video and playlist", () => {
      expect(
        normaliseUrl(
          "https://www.youtube.com/watch?v=0F3QP2Bt1KI&list=PL0h&index=5&si=abc&feature=shared",
        ),
      ).toBe("https://www.youtube.com/watch?v=0F3QP2Bt1KI&list=PL0h&index=5");
      expect(normaliseUrl("https://youtube.com/shorts/QDIQ?si=7ODi")).toBe(
        "https://youtube.com/shorts/QDIQ",
      );
    });

    it("keeps si on sites where it isn't tracking", () => {
      expect(normaliseUrl("https://example.com/search?si=2")).toBe(
        "https://example.com/search?si=2",
      );
    });

    it("leaves untouched query strings exactly as they were", () => {
      expect(normaliseUrl("https://example.com/s?q=a%20b&x=1")).toBe(
        "https://example.com/s?q=a%20b&x=1",
      );
    });

    it("keeps the fragment", () => {
      expect(normaliseUrl("https://example.com/a?utm_source=x#section")).toBe(
        "https://example.com/a#section",
      );
    });
  });
});

describe("titleFromUrl", () => {
  it("uses the humanised last path segment plus the domain", () => {
    expect(
      titleFromUrl(
        "https://www.jamieoliver.com/recipes/chicken-recipes/perfect-roast-chicken/",
      ),
    ).toBe("Perfect roast chicken – jamieoliver.com");
  });

  it("falls back to the bare domain when there is no path", () => {
    expect(titleFromUrl("http://bbc.co.uk/")).toBe("bbc.co.uk");
  });

  it("strips common page extensions and underscores", () => {
    expect(titleFromUrl("https://site.com/view_video.php?id=1")).toBe(
      "View video – site.com",
    );
  });

  it("skips purely numeric segments", () => {
    expect(titleFromUrl("https://qz.com/985821/")).toBe("qz.com");
    expect(titleFromUrl("https://example.org/articles/12345")).toBe(
      "Articles – example.org",
    );
  });

  it("decodes percent-encoded segments", () => {
    expect(titleFromUrl("https://example.com/caf%C3%A9-guide")).toBe(
      "Café guide – example.com",
    );
  });

  it("copes with malformed percent-encoding", () => {
    expect(titleFromUrl("https://example.com/bad%E0%A4%A")).toBe(
      "Bad%E0%A4%A – example.com",
    );
  });

  it("returns the input when it isn't a URL", () => {
    expect(titleFromUrl("not a url")).toBe("not a url");
  });
});

describe("resolveTitle", () => {
  const href = "https://example.com/great-article";

  it("keeps a real title, trimmed", () => {
    expect(resolveTitle("  A Great Article ", href)).toBe("A Great Article");
  });

  it("derives a title when it is missing or blank", () => {
    expect(resolveTitle(undefined, href)).toBe("Great article – example.com");
    expect(resolveTitle("   ", href)).toBe("Great article – example.com");
  });

  it("derives a title when the title is just a URL", () => {
    expect(resolveTitle("https://example.com/great-article", href)).toBe(
      "Great article – example.com",
    );
  });
});
