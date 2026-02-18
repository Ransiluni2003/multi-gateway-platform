"use client";

import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemButton from "@mui/material/ListItemButton";

export default function Sidebar({
  open = false,
  variant = "permanent",
  onClose,
}: {
  open?: boolean;
  variant?: 'permanent' | 'temporary' | 'persistent';
  onClose?: () => void;
}) {
  return (
    <Drawer variant={variant} open={open} onClose={onClose} sx={{ width: 240, flexShrink: 0 }}>
      <List sx={{ width: 240 }}>
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemText primary="Home" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemText primary="Products" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemText primary="Orders" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
}
