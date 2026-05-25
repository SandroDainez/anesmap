"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// Inline script injected in <head> — runs synchronously before React hydration
// to prevent the flash of wrong theme.
export const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('anesmap-theme');
    if (t === 'light') document.documentElement.classList.add('light');
  } catch(e) {}
})();
`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  // Sync with what the inline script already applied to <html>
  useEffect(() => {
    const stored = localStorage.getItem("anesmap-theme") as Theme | null;
    const resolved = stored ?? "dark";
    setTheme(resolved);
    if (resolved === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("anesmap-theme", next);
      if (next === "light") {
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
      }
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
