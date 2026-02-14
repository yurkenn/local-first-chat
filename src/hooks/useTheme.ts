/**
 * useTheme.ts — Theme management hook.
 *
 * Supports three themes: dark (default), light, and amoled.
 * Persists theme preference in localStorage.
 * Applies theme via data-theme attribute on <html>.
 */

import { useState, useEffect, useCallback } from "react";

export type Theme = "dark" | "light" | "amoled";

const STORAGE_KEY = "lotus-theme";

function getInitialTheme(): Theme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        if (stored && ["dark", "light", "amoled"].includes(stored)) {
            return stored;
        }
    } catch { }
    return "dark";
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        try {
            localStorage.setItem(STORAGE_KEY, newTheme);
        } catch { }
        document.documentElement.setAttribute("data-theme", newTheme);
    }, []);

    // Apply on mount
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    return { theme, setTheme };
}
