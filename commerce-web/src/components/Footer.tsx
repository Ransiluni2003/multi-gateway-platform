"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function Footer() {
  return (
    <Box component="footer" sx={{ py: 2, px: 3, textAlign: "center" }}>
      <Typography variant="body2">© {new Date().getFullYear()} Commerce Demo</Typography>
    </Box>
  );
}
