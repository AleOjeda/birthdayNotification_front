import { useMemo, useState } from "react";
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
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { createCustomer } from "../../api/customers";
import {
  birthdayInitialValues,
  birthdaySchemaShape,
  buildBirthdayPayload,
  isLeapDayWithAge,
} from "../../lib/birthdayForm";
import BirthdayFields from "../birthdayList/BirthdayFields";
import { useUnsavedChanges } from "../../lib/unsavedChanges";

const initialValues = {
  name: "",
  last_name: "",
  ...birthdayInitialValues(null),
};

export default function RegisterBirthday() {
  const [feedback, setFeedback] = useState(null); // { severity, message }

  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        name: Yup.string().trim().required("Requerido"),
        last_name: Yup.string().trim().required("Requerido"),
        ...birthdaySchemaShape(),
      }),
    [],
  );

  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        await createCustomer({
          name: values.name.trim(),
          last_name: values.last_name.trim(),
          ...buildBirthdayPayload(values),
        });
        resetForm();
        setFeedback({
          severity: "success",
          message: "Cumpleaños guardado correctamente.",
        });
      } catch (err) {
        let message =
          err?.message || "No pudimos guardar el cumpleaños. Inténtalo de nuevo.";
        if (err?.status === 400 && isLeapDayWithAge(values)) {
          message += " Prueba cambiando a «Año de nacimiento».";
        }
        setFeedback({ severity: "error", message });
      }
    },
  });

  // Cambios sin guardar o guardado en vuelo: no se recarga por actualización.
  useUnsavedChanges(formik.dirty || formik.isSubmitting);

  const fieldProps = (field, extraSlots = {}) => ({
    name: field,
    value: formik.values[field],
    onChange: formik.handleChange,
    onBlur: formik.handleBlur,
    error: formik.touched[field] && Boolean(formik.errors[field]),
    helperText: formik.touched[field] ? formik.errors[field] : undefined,
    required: true,
    fullWidth: true,
    // readOnly (no disabled) para no perder el foco al enviar
    slotProps: { input: { readOnly: formik.isSubmitting }, ...extraSlots },
  });

  return (
    <Box sx={{ maxWidth: 520, mx: "auto" }}>
      <Box mb={{ xs: 1.5, md: 2 }}>
        <Typography variant="h5" component="h1">
          <span aria-hidden>🎁</span> Nuevo cumpleaños
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Registra a una persona para recibir su recordatorio de cumpleaños
        </Typography>
      </Box>

      <Card sx={{ p: { xs: 2, md: 2.5 } }}>
        <Box component="form" onSubmit={formik.handleSubmit} noValidate>
          <Stack spacing={1.5}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
                alignItems: "start",
              }}
            >
              <TextField
                label="Nombre"
                autoComplete="given-name"
                {...fieldProps("name")}
              />
              <TextField
                label="Apellido"
                autoComplete="family-name"
                {...fieldProps("last_name")}
              />
            </Box>

            <BirthdayFields
              dense
              values={formik.values}
              errors={formik.errors}
              touched={formik.touched}
              setFieldValue={formik.setFieldValue}
              setFieldTouched={formik.setFieldTouched}
              readOnly={formik.isSubmitting}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={formik.isSubmitting}
              startIcon={
                formik.isSubmitting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
            >
              {formik.isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </Stack>
        </Box>
      </Card>

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={5000}
        onClose={(_, reason) => {
          if (reason !== "clickaway") setFeedback(null);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {feedback ? (
          <Alert
            severity={feedback.severity}
            variant="filled"
            onClose={() => setFeedback(null)}
            sx={{ width: "100%" }}
          >
            {feedback.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
