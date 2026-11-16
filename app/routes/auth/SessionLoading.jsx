import { Box, CircularProgress } from "@mui/material";

// Fallback de hidratación: no contiene datos protegidos.
export default function SessionLoading() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <CircularProgress role="status" aria-label="Cargando" />
    </Box>
  );
}
