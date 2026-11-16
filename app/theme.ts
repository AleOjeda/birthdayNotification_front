import { alpha, createTheme } from "@mui/material/styles";

const fontFamily =
  '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const primaryMain = "#7C3AED";
const secondaryMain = "#C2410C";

const softShadow = "0 1px 3px rgba(31, 24, 54, 0.06), 0 4px 14px rgba(31, 24, 54, 0.06)";
const hoverShadow = "0 4px 8px rgba(31, 24, 54, 0.08), 0 12px 28px rgba(31, 24, 54, 0.10)";

const baseTheme = createTheme();

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: primaryMain, light: "#A78BFA", dark: "#5B21B6", contrastText: "#fff" },
    secondary: { main: secondaryMain, light: "#FB923C", dark: "#9A3412", contrastText: "#fff" },
    success: { main: "#16A34A", contrastText: "#1F1836" },
    warning: { main: "#F59E0B", contrastText: "#1F1836" },
    error: { main: "#E11D48", contrastText: "#fff" },
    info: { main: "#0EA5E9", contrastText: "#1F1836" },
    background: { default: "#FAF7FF", paper: "#FFFFFF" },
    text: { primary: "#1F1836", secondary: "#6B6485" },
    divider: "rgba(31, 24, 54, 0.08)",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily,
    h1: { fontWeight: 800, letterSpacing: "-0.02em" },
    h2: { fontWeight: 800, letterSpacing: "-0.02em" },
    h3: { fontWeight: 700, letterSpacing: "-0.01em" },
    h4: { fontWeight: 700, letterSpacing: "-0.01em" },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: { fontWeight: 600, textTransform: "none", letterSpacing: 0 },
  },
  shadows: baseTheme.shadows.map((s, i) =>
    i === 0 ? s : i <= 2 ? softShadow : i <= 8 ? hoverShadow : s,
  ) as typeof baseTheme.shadows,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: "#FAF7FF" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, padding: "8px 18px" },
        sizeLarge: { padding: "11px 24px" },
        sizeSmall: { padding: "4px 12px" },
        containedPrimary: {
          backgroundImage: `linear-gradient(135deg, #6D28D9, ${primaryMain})`,
          "&:hover": {
            backgroundImage: "linear-gradient(135deg, #5B21B6, #6D28D9)",
            boxShadow: `0 6px 16px ${alpha(primaryMain, 0.35)}`,
          },
          "&.Mui-disabled": { backgroundImage: "none" },
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: "1px solid rgba(31, 24, 54, 0.06)",
          boxShadow: softShadow,
          transition: "box-shadow .2s ease, transform .2s ease",
          "&:hover": { boxShadow: hoverShadow },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        rounded: { borderRadius: 16 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "medium" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: "#fff",
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: primaryMain },
          "&.Mui-disabled": { backgroundColor: "rgba(31,24,54,0.04)" },
        },
        notchedOutline: { borderColor: "rgba(31, 24, 54, 0.18)" },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: `linear-gradient(135deg, ${primaryMain}, #C026D3)`,
          boxShadow: "0 2px 12px rgba(124, 58, 237, 0.25)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#fff",
          borderRight: "1px solid rgba(31, 24, 54, 0.08)",
          backgroundImage: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 600 },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 20 } },
    },
  },
});

export default theme;
