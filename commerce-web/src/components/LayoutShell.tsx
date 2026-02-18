"use client";

import React, { useState } from "react";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { AuthProvider } from "./AuthProvider";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up("md"));

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <AuthProvider>
      <Box className="min-h-screen flex">
        <Sidebar open={mdUp ? true : open} variant={mdUp ? "permanent" : "temporary"} onClose={handleClose} />

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Header onOpenSidebar={handleOpen} />
          <Box component="main" sx={{ flex: 1 }}>
            {children}
          </Box>
          <Footer />
        </Box>
      </Box>
    </AuthProvider>
  );
}
