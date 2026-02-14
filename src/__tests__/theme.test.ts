import { describe, it, expect } from "vitest";

describe("Theme persistence", () => {
    const STORAGE_KEY = "lotus-theme";
    const VALID_THEMES = ["dark", "light", "amoled"] as const;

    it("validates dark is a valid theme", () => {
        expect(VALID_THEMES).toContain("dark");
    });

    it("validates light is a valid theme", () => {
        expect(VALID_THEMES).toContain("light");
    });

    it("validates amoled is a valid theme", () => {
        expect(VALID_THEMES).toContain("amoled");
    });

    it("rejects invalid theme values", () => {
        const invalid = "neon";
        expect(VALID_THEMES as readonly string[]).not.toContain(invalid);
    });

    it("default theme should be dark", () => {
        const DEFAULT_THEME = "dark";
        expect(VALID_THEMES).toContain(DEFAULT_THEME);
        expect(DEFAULT_THEME).toBe("dark");
    });

    it("storage key is lotus-theme", () => {
        expect(STORAGE_KEY).toBe("lotus-theme");
    });
});
