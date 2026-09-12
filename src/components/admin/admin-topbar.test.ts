import { describe, expect, it } from "vitest";

import { initials } from "./admin-topbar";

describe("initials", () => {
  it("takes the first letter of the first two words, uppercased", () => {
    expect(initials("Post Author")).toBe("PA");
    expect(initials("admin crud")).toBe("AC");
  });

  it("falls back to a single-letter or the '?' placeholder", () => {
    expect(initials("Cher")).toBe("C");
    expect(initials("")).toBe("?");
    expect(initials(undefined)).toBe("?");
    expect(initials("   ")).toBe("?");
  });

  it("only uses the first two words when given more", () => {
    expect(initials("Ada Lovelace Byron")).toBe("AL");
  });
});
