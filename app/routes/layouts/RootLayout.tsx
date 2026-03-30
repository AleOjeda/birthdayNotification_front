import { Outlet, Link, useLocation } from "react-router";
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Box,
} from "@mui/material";
import { useNavigate } from "react-router";
import { Button, Stack } from "@mui/material";

export default function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const menu = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Registrar", path: "/register" },
    { label: "Lista", path: "/list" },
    { label: "Calendario", path: "/calendar" },
  ];

  return (
    <Box sx={{ display: "flex" }}>
      {/* TOP BAR */}
      <AppBar position="fixed" elevation={1}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" fontWeight="bold">
            🎂 Birthday Notifier
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button
              color="inherit"
              variant="outlined"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </Button>

            <Button
              color="inherit"
              variant="outlined"
              onClick={() => navigate("/list")}
            >
              Lista
            </Button>

            <Button variant="contained" onClick={() => navigate("/register")}>
              + Nuevo
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* SIDEBAR */}
      <Drawer
        variant="permanent"
        sx={{
          width: 220,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: 220,
            boxSizing: "border-box",
            marginTop: "64px",
            borderRight: "1px solid #eee",
          },
        }}
      >
        <List sx={{ px: 1 }}>
          {menu.map((item) => {
            const active = location.pathname === item.path;

            return (
              <ListItemButton
                key={item.path}
                component={Link}
                to={item.path}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  backgroundColor: active ? "#e3f2fd" : "transparent",
                  color: active ? "#1976d2" : "inherit",
                  "&:hover": {
                    backgroundColor: "#f5f5f5",
                  },
                }}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      {/* CONTENT */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 4,
          mt: 8,
          background: "#f9fafb",
          minHeight: "100vh",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
