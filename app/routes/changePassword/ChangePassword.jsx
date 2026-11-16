import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { changePassword } from "../../api/auth";
import { getUser } from "../../lib/session";
import { loginErrorMessage } from "../../lib/authErrors";
import { changePasswordLoader } from "../../lib/guard";
import SessionLoading from "../auth/SessionLoading";
import PasswordField from "../auth/PasswordField";
import { useUnsavedChanges } from "../../lib/unsavedChanges";

const FIELDS = ["currentPassword", "newPassword", "confirmPassword"];
export const clientLoader = changePasswordLoader;
export const HydrateFallback = SessionLoading;

const byteLength = (v) => new TextEncoder().encode(v || "").length;
const charLength = (v) => [...(v || "")].length;

export function buildSchema() {
  return Yup.object({
    currentPassword: Yup.string().required("Ingresa tu contraseña actual"),
    newPassword: Yup.string()
      .required("Ingresa la nueva contraseña")
      .test("min-chars", "Debe tener al menos 12 caracteres", (v) => charLength(v) >= 12)
      .test("max-bytes", "No puede superar 72 bytes", (v) => byteLength(v) <= 72)
      .test("different", "Debe ser distinta de la actual", function (v) {
        return !v || v !== this.parent.currentPassword;
      }),
    confirmPassword: Yup.string()
      .required("Repite la nueva contraseña")
      .oneOf([Yup.ref("newPassword")], "Las contraseñas no coinciden"),
  });
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [mustChange, setMustChange] = useState(null); // null: sesión aún desconocida
  const redirectTimer = useRef(null);
  const schema = useMemo(buildSchema, []);

  useEffect(() => {
    // Sin sesión legible se asume cambio obligatorio (más restrictivo).
    const user = getUser();
    setMustChange(user ? user.must_change_password !== false : true);
    return () => clearTimeout(redirectTimer.current);
  }, []);

  const formik = useFormik({
    initialValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    validationSchema: schema,
    onSubmit: async (values, { setFieldError, setFieldValue, resetForm }) => {
      setServerError(null);
      try {
        await changePassword(values.currentPassword, values.newPassword);
        resetForm();
        setSuccess(true);
        redirectTimer.current = setTimeout(
          () => navigate("/dashboard", { replace: true }),
          900,
        );
      } catch (err) {
        if (err?.status === 401 && err.message === "Credenciales inválidas") {
          setFieldError("currentPassword", err.message);
          document.getElementById("currentPassword")?.focus();
        } else if (err?.status === 401) {
          navigate("/login", { replace: true });
        } else {
          setServerError(
            err?.status === 429
              ? loginErrorMessage(err)
              : err?.message || "No pudimos cambiar la contraseña. Inténtalo de nuevo.",
          );
        }
        setFieldValue("confirmPassword", "", false);
      }
    },
  });

  useUnsavedChanges(formik.dirty || formik.isSubmitting || success);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formik.isSubmitting) return;
    const errors = await formik.validateForm();
    const first = FIELDS.find((f) => errors[f]);
    if (first) {
      formik.setTouched({ currentPassword: true, newPassword: true, confirmPassword: true });
      document.getElementById(first)?.focus();
      return;
    }
    formik.handleSubmit(e);
  };

  const field = (name, label, autoComplete) => {
    const shown = formik.touched[name] && formik.errors[name];
    return {
      id: name,
      name,
      label,
      value: formik.values[name],
      onChange: formik.handleChange,
      onBlur: formik.handleBlur,
      error: Boolean(shown),
      helperText: shown || undefined,
      required: true,
      fullWidth: true,
      slotProps: {
        input: { readOnly: formik.isSubmitting },
        htmlInput: {
          autoComplete,
          "aria-describedby":
            name === "newPassword" ? "newPassword-helper-text password-policy" : undefined,
        },
      },
    };
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        bgcolor: "background.default",
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 480, p: { xs: 2.5, sm: 4 } }}>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 800, mb: 1 }}>
          <span aria-hidden>🎂</span> Birthday Notifier
        </Typography>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          Cambia tu contraseña
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {mustChange === null
            ? " "
            : mustChange
              ? "Debes elegir una nueva contraseña antes de continuar."
              : "Elige una nueva contraseña para tu cuenta."}
        </Typography>
        <Box
          id="password-policy"
          component="ul"
          sx={{ m: 0, mb: 2.5, pl: 3, color: "text.secondary", typography: "body2" }}
        >
          <li>Mínimo 12 caracteres y máximo 72 bytes.</li>
          <li>Distinta de tu contraseña actual.</li>
          <li>No uses tu usuario ni tu correo.</li>
        </Box>
        <form onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.5}>
            {serverError && (
              <Alert severity="error" role="alert">
                {serverError}
              </Alert>
            )}
            <PasswordField
              {...field("currentPassword", "Contraseña actual", "current-password")}
              autoFocus
            />
            <PasswordField {...field("newPassword", "Nueva contraseña", "new-password")} />
            <PasswordField
              {...field("confirmPassword", "Repetir nueva contraseña", "new-password")}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={formik.isSubmitting || success}
              startIcon={
                formik.isSubmitting ? <CircularProgress size={18} color="inherit" /> : null
              }
            >
              {formik.isSubmitting ? "Guardando…" : "Cambiar contraseña"}
            </Button>
          </Stack>
        </form>
      </Card>
      <Snackbar open={success} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" variant="filled">
          Contraseña actualizada correctamente.
        </Alert>
      </Snackbar>
    </Box>
  );
}
