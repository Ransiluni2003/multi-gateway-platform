"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import getAppTheme from "../theme";

type ColorMode = {
  mode: "light" | "dark";
  toggleMode: () => void;
};

const ThemeContext = createContext<ColorMode | undefined>(undefined);

export const useColorMode = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useColorMode must be used within MuiProvider");
  return ctx;
};

export default function MuiProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme-mode");
      if (stored === "light" || stored === "dark") setMode(stored);
      else {
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        setMode(prefersDark ? "dark" : "light");
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const toggleMode = () => {
    setMode((m) => {
      const next = m === "light" ? "dark" : "light";
      try {
        localStorage.setItem("theme-mode", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const theme = useMemo(() => getAppTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
