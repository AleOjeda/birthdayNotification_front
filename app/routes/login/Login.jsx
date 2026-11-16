import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { login } from "../../api/auth";
import { getToken, getUser } from "../../lib/session";
import { loginErrorMessage } from "../../lib/authErrors";
import { safeNextPath } from "../../lib/safeRedirect";
import PasswordField from "../auth/PasswordField";
import AppVersion from "../components/AppVersion";
import { useUnsavedChanges } from "../../lib/unsavedChanges";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);
  const identifierRef = useRef(null);
  const next = safeNextPath(params.get("next"));
  // Un login en curso (o campos escritos) nunca se interrumpe con una recarga.
  useUnsavedChanges(submitting || identifier !== "" || password !== "");

  useEffect(() => {
    if (getToken()) {
      navigate(getUser()?.must_change_password ? "/cambiar-contrasena" : next, {
        replace: true,
      });
    }
  }, [navigate, next]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inFlight.current) return;
    if (identifier.trim() === "" || password === "") {
      setError("Ingresa tu usuario o correo y tu contraseña.");
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    const pwd = password;
    setPassword("");
    try {
      const user = await login(identifier.trim(), pwd);
      navigate(user?.must_change_password ? "/cambiar-contrasena" : next, {
        replace: true,
      });
    } catch (err) {
      setError(loginErrorMessage(err));
      identifierRef.current?.focus();
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
      <Card sx={{ width: "100%", maxWidth: 420, p: { xs: 2.5, sm: 4 } }}>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 800, mb: 1 }}>
          <span aria-hidden>🎂</span> Birthday Notifier
        </Typography>
        <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
          Iniciar sesión
        </Typography>
        <form onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.5}>
            {error && (
              <Alert severity="error" role="alert">
                {error}
              </Alert>
            )}
            <TextField
              label="Usuario o correo"
              name="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              fullWidth
              required
              autoFocus
              inputRef={identifierRef}
              slotProps={{
                input: { readOnly: submitting },
                htmlInput: {
                  autoComplete: "username",
                  autoCapitalize: "none",
                  spellCheck: false,
                },
              }}
            />
            <PasswordField
              label="Contraseña"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              slotProps={{
                input: { readOnly: submitting },
                htmlInput: { autoComplete: "current-password" },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={
                submitting ? <CircularProgress size={18} color="inherit" /> : null
              }
            >
              {submitting ? "Ingresando…" : "Ingresar"}
            </Button>
          </Stack>
        </form>
      </Card>
      </Box>
      {/* En el flujo (no absoluto): no solapa la tarjeta en alturas bajas. */}
      <AppVersion sx={{ px: 1.5, pb: 1, maxWidth: "100%" }} />
    </Box>
  );
}
