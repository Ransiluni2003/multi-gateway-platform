import { createTheme, ThemeOptions } from "@mui/material/styles";

export const getAppTheme = (mode: "light" | "dark") => {
  const common: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: "#1976d2",
      },
      secondary: {
        main: "#9c27b0",
      },
    },
    typography: {
      fontFamily: 'Inter, Roboto, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      h1: { fontSize: "2rem" },
    },
  };

  return createTheme(common);
};

export default getAppTheme;
