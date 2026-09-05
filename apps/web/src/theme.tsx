import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeId = "default" | "midnight" | "ocean" | "sunset" | "forest" | "lavender" | "graphite" | "rose" | "terminal" | "sand" | "cobalt" | "plum" | "mint" | "copper" | "mono" | "abyss" | "ember" | "aurora" | "violet" | "navy";

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
  { id: "cobalt", name: "Cobalt", description: "Electric blue focus", swatches: ["#3f63d8", "#eef2ff", "#ffffff"] },
  { id: "plum", name: "Plum", description: "Rich evening editorial", swatches: ["#914b8b", "#fbf0fa", "#ffffff"] },
  { id: "mint", name: "Mint", description: "Fresh lightweight clarity", swatches: ["#138a78", "#eafaf5", "#ffffff"] },
  { id: "copper", name: "Copper", description: "Crafted warm contrast", swatches: ["#b65c35", "#fff2e9", "#fffdfb"] },
  { id: "mono", name: "Mono", description: "Quiet black and white", swatches: ["#333333", "#f3f3f3", "#ffffff"] },
  { id: "abyss", name: "Abyss", description: "Deep blue-black focus", swatches: ["#6ea8ff", "#080b12", "#121a29"] },
  { id: "ember", name: "Ember", description: "Warm firelit workspace", swatches: ["#ff9b6b", "#160d0b", "#2b1815"] },
  { id: "aurora", name: "Aurora", description: "Teal light in the dark", swatches: ["#64e8d2", "#071517", "#123336"] },
  { id: "violet", name: "Violet", description: "Deep creative night", swatches: ["#c59bff", "#110d1d", "#261a39"] },
  { id: "navy", name: "Navy", description: "Clear midnight blue", swatches: ["#7fb3ff", "#091323", "#162746"] },
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
