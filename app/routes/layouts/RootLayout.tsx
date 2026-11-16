import { useEffect, useState } from "react";
import { guardLoader } from "../../lib/guard";
import { useSessionBar } from "../../lib/sessionHooks";
import AppVersion from "../components/AppVersion";
import SessionLoading from "../auth/SessionLoading";
import { Outlet, Link, useLocation } from "react-router";
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Button,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import AddIcon from "@mui/icons-material/Add";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ListAltIcon from "@mui/icons-material/ListAlt";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

export const clientLoader = guardLoader;
export const HydrateFallback = SessionLoading;
// El guard debe ejecutarse en cada navegación entre rutas protegidas (por
// defecto React Router no revalida el loader del layout al cambiar de hijo).
export const shouldRevalidate = () => true;

const DRAWER_WIDTH = 240;

const menu = [
  { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
  { label: "Registrar", path: "/register", icon: <PersonAddIcon /> },
  { label: "Lista", path: "/list", icon: <ListAltIcon /> },
  { label: "Calendario", path: "/calendar", icon: <CalendarMonthIcon /> },
];

export default function RootLayout() {
  const location = useLocation();
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { userName, loggingOut, logout } = useSessionBar();

  useEffect(() => {
    const mq = window.matchMedia(theme.breakpoints.up("md").replace(/^@media\s*/, ""));
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const logoutSx = {
    borderRadius: 2,
    color: "text.secondary",
    "&:hover": { color: "primary.main" },
  };

  const drawerContent = (mobile: boolean) => (
    <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
      <List sx={{ px: 1.5, py: 2 }} component="nav" aria-label="Navegación principal">
        {menu.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              selected={active}
              aria-current={active ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: active ? "primary.dark" : "text.secondary",
                fontWeight: active ? 700 : 500,
                borderLeft: "3px solid",
                borderColor: active ? "primary.main" : "transparent",
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  color: "primary.main",
                },
                "&.Mui-selected": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.14),
                },
                "&.Mui-selected:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.16),
                  color: "primary.dark",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{ primary: { fontWeight: "inherit" } }}
              />
            </ListItemButton>
          );
        })}
      </List>
      {mobile && (
        <List sx={{ px: 1.5, pb: 2 }} aria-label="Sesión">
          {userName && (
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1 }}
              data-testid="drawer-user"
            >
              <AccountCircleIcon color="action" aria-hidden />
              <Typography variant="body2" noWrap>
                {userName}
              </Typography>
            </Box>
          )}
          <ListItemButton
            onClick={() => {
              setMobileOpen(false);
              void logout();
            }}
            disabled={loggingOut}
            sx={logoutSx}
          >
            <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Cerrar sesión" />
          </ListItemButton>
        </List>
      )}
      <AppVersion sx={{ mt: "auto", px: 2.5, py: 1 }} />
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      {/* TOP BAR */}
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              color="inherit"
              edge="start"
              aria-label="Abrir menú"
              aria-controls="drawer-navegacion"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              sx={{ display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              component={Link}
              to="/dashboard"
              sx={{ color: "inherit", textDecoration: "none", fontWeight: 800 }}
            >
              <span aria-hidden>🎂</span> Birthday Notifier
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              component={Link}
              to="/register"
              variant="contained"
              color="secondary"
              startIcon={<AddIcon />}
              sx={{ boxShadow: 2 }}
            >
              Nuevo
            </Button>
            {userName && (
              <Typography
                variant="body2"
                noWrap
                data-testid="appbar-user"
                sx={{ display: { xs: "none", sm: "block" }, maxWidth: 200 }}
              >
                {userName}
              </Typography>
            )}
            <IconButton
              color="inherit"
              aria-label="Cerrar sesión"
              onClick={() => void logout()}
              disabled={loggingOut}
              sx={{
                display: { xs: "none", md: "inline-flex" },
                "&.Mui-focusVisible": { outline: "2px solid currentColor" },
              }}
            >
              {loggingOut ? <CircularProgress size={22} color="inherit" /> : <LogoutIcon />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* SIDEBAR */}
      <Box
        component="aside"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          slotProps={{ paper: { id: "drawer-navegacion" } }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
          }}
        >
          <Toolbar />
          {drawerContent(true)}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
          }}
        >
          <Toolbar />
          {drawerContent(false)}
        </Drawer>
      </Box>

      {/* CONTENT */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 2, md: 4 },
          bgcolor: "background.default",
          minHeight: "100vh",
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
