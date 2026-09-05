import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { LanguageProvider } from "./i18n";
import { ThemeProvider } from "./theme";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider><ThemeProvider><App /></ThemeProvider></LanguageProvider>
  </StrictMode>,
);
