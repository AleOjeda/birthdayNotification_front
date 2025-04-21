import { Outlet, Link } from "react-router";
import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemText,
  ListItemButton,Box, Button, CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import WhatsappQR from "../components/whatsappQR";
import SenderButton from "../components/senderButton"
export default function RootLayout() {
  const drawerWidth = 240;


  return (
    <div style={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Birthday Notifier
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            marginTop: "64px", // Ajustar según la altura del AppBar
          },
        }}
      >
        <List>
          <ListItemButton component={Link} to="/register">
            Registrar
          </ListItemButton>
          <ListItemButton component={Link} to="/list">
            Ver Lista
          </ListItemButton>
        </List>
         {/* Botón destacado */}
        <Box sx={{ p: 2, mt: "auto", mb: "auto" }}>
  <SenderButton />
        <WhatsappQR />
        </Box>
      </Drawer>

      <main style={{ flexGrow: 1, padding: "80px 16px 16px 16px" }}>
        <Outlet />
      </main>
    </div>
  );
}
