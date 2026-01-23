"use client";

import IconButton from "@mui/material/IconButton";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useColorMode } from "./MuiProvider";

export default function ThemeToggle() {
  const { mode, toggleMode } = useColorMode();

  return (
    <IconButton color="inherit" onClick={toggleMode} aria-label="toggle theme">
      {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
    </IconButton>
  );
}
