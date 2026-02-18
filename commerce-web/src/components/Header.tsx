"use client";

import Link from "next/link";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import ThemeToggle from "./ThemeToggle";
import MiniCart from "./MiniCart";
import { useAuth } from "./AuthProvider";

export default function Header({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const { user, loading, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AppBar position="sticky">
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {onOpenSidebar ? (
            <IconButton
              color="inherit"
              edge="start"
              onClick={onOpenSidebar}
              sx={{ mr: 1, display: { md: 'none' } }}
              aria-label="open sidebar"
            >
              <MenuIcon />
            </IconButton>
          ) : null}

          <Typography variant="h6" component="div">
            Commerce Demo
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button color="inherit" component={Link} href="/">
            Home
          </Button>
          <Button color="inherit" component={Link} href="/products">
            Products
          </Button>
          <Button color="inherit" component={Link} href="/cart">
            Cart
          </Button>
          <MiniCart />
          <Button color="inherit" component={Link} href="/orders">
            Orders
          </Button>
          {isAdmin ? (
            <Button color="inherit" component={Link} href="/admin">
              Admin
            </Button>
          ) : null}

          {!loading && user ? (
            <>
              <Typography variant="body2" sx={{ color: "inherit", opacity: 0.8 }}>
                {user.email} ({user.role})
              </Typography>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Button color="inherit" component={Link} href="/login">
              Login
            </Button>
          )}
          <ThemeToggle />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
