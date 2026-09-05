import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeId = "default" | "midnight" | "ocean" | "sunset" | "forest" | "lavender" | "graphite" | "rose" | "terminal" | "sand";

export const themes: Array<{ id: ThemeId; name: string; description: string; swatches: string[] }> = [
  { id: "default", name: "Default", description: "Calm repository green", swatches: ["#1f6b58", "#f1f3f2", "#ffffff"] },
  { id: "midnight", name: "Midnight", description: "Focused dark workspace", swatches: ["#8b9cff", "#111522", "#1b2233"] },
  { id: "ocean", name: "Ocean", description: "Cool blue clarity", swatches: ["#176b87", "#eef7fa", "#ffffff"] },
  { id: "sunset", name: "Sunset", description: "Warm amber energy", swatches: ["#a64b2a", "#fff7ed", "#ffffff"] },
  { id: "forest", name: "Forest", description: "Deep natural focus", swatches: ["#2d6a4f", "#edf5ef", "#ffffff"] },
  { id: "lavender", name: "Lavender", description: "Soft creative calm", swatches: ["#7657a8", "#f5f1fb", "#ffffff"] },
  { id: "graphite", name: "Graphite", description: "Neutral dark precision", swatches: ["#d6b36a", "#17191e", "#22262e"] },
  { id: "rose", name: "Rose", description: "Warm editorial blush", swatches: ["#b44968", "#fff1f4", "#ffffff"] },
  { id: "terminal", name: "Terminal", description: "High-contrast green glow", swatches: ["#63e6be", "#07130f", "#0d2119"] },
  { id: "sand", name: "Sand", description: "Quiet paper workspace", swatches: ["#8a5a2b", "#faf4e8", "#fffdf7"] },
];

type ThemeContextValue = { theme: ThemeId; setTheme: (theme: ThemeId) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(loadTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = (next: ThemeId) => {
    try { localStorage.setItem("mory.theme", next); } catch { /* preference storage is optional */ }
    setThemeState(next);
  };

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function loadTheme(): ThemeId {
  try {
    const saved = localStorage.getItem("mory.theme");
    return themes.some((item) => item.id === saved) ? saved as ThemeId : "default";
  } catch {
    return "default";
  }
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
