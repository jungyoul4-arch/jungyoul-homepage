import { describe, it, expect } from "vitest";
import { getHeaderLinkIcon, HEADER_LINK_ICONS, HEADER_LINK_ICON_NAMES } from "../header-link-icons";

describe("HEADER_LINK_ICONS", () => {
  it("is a non-empty record", () => {
    expect(Object.keys(HEADER_LINK_ICONS).length).toBeGreaterThan(0);
  });

  it("HEADER_LINK_ICON_NAMES matches object keys", () => {
    expect(HEADER_LINK_ICON_NAMES).toEqual(Object.keys(HEADER_LINK_ICONS));
  });
});

describe("getHeaderLinkIcon", () => {
  it("returns the matching icon for a known name", () => {
    const icon = getHeaderLinkIcon("BookOpen");
    expect(icon).toBe(HEADER_LINK_ICONS["BookOpen"]);
  });

  it("returns ExternalLink as fallback for null", () => {
    expect(getHeaderLinkIcon(null)).toBe(HEADER_LINK_ICONS["ExternalLink"]);
  });

  it("returns ExternalLink as fallback for undefined", () => {
    expect(getHeaderLinkIcon(undefined)).toBe(HEADER_LINK_ICONS["ExternalLink"]);
  });

  it("returns ExternalLink as fallback for unknown name", () => {
    expect(getHeaderLinkIcon("NonExistentIcon")).toBe(HEADER_LINK_ICONS["ExternalLink"]);
  });

  it("returns ExternalLink for empty string", () => {
    expect(getHeaderLinkIcon("")).toBe(HEADER_LINK_ICONS["ExternalLink"]);
  });
});
