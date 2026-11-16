import { useMemo } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import {
  birthdayInitialValues,
  birthdaySchemaShape,
  buildBirthdayPayload,
} from "../../lib/birthdayForm";
import BirthdayFields from "./BirthdayFields";
import { useUnsavedChanges } from "../../lib/unsavedChanges";

function EditForm({ customer, onClose, onSave, saving }) {
  const hadSavedYear =
    customer.birth_year !== null && customer.birth_year !== undefined;

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
    initialValues: {
      name: customer.name ?? "",
      last_name: customer.last_name ?? "",
      ...birthdayInitialValues(customer),
    },
    validationSchema,
    validateOnMount: true,
    onSubmit: (values) =>
      onSave({
        name: values.name.trim(),
        last_name: values.last_name.trim(),
        ...buildBirthdayPayload(values, { clearSavedYear: hadSavedYear }),
      }),
  });

  // Cambios sin guardar o guardado en vuelo: no se recarga por actualización.
  useUnsavedChanges(formik.dirty || saving);

  const invalid = Object.keys(formik.errors).length > 0;

  const textProps = (field) => ({
    name: field,
    value: formik.values[field],
    onChange: formik.handleChange,
    onBlur: formik.handleBlur,
    error: Boolean(formik.errors[field]),
    helperText: formik.errors[field] || " ",
    required: true,
    fullWidth: true,
    // readOnly (no disabled) para no perder el foco mientras guarda
    slotProps: { input: { readOnly: saving } },
  });

  return (
    <form onSubmit={formik.handleSubmit} noValidate>
      <DialogTitle>
        <span aria-hidden>✏️</span> Editar cumpleaños
      </DialogTitle>

      <DialogContent>
        <Stack spacing={1} pt={1}>
          <TextField label="Nombre" autoComplete="off" {...textProps("name")} />
          <TextField
            label="Apellido"
            autoComplete="off"
            {...textProps("last_name")}
          />
          <BirthdayFields
            values={formik.values}
            errors={formik.errors}
            touched={{ ...formik.touched, birth_day: true, birth_month: true }}
            setFieldValue={formik.setFieldValue}
            setFieldTouched={formik.setFieldTouched}
            readOnly={saving}
            hadSavedYear={hadSavedYear}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={saving || invalid}
          startIcon={
            saving ? <CircularProgress size={18} color="inherit" /> : null
          }
        >
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
    </form>
  );
}

/**
 * Props: open, customer ({ id, name, last_name, birth_day, birth_month,
 * birth_year, ... }), onClose, onSave(payload) y saving.
 * Quien lo usa llama a la API en onSave; aquí solo se arma el payload.
 */
export default function EditBirthdayModal({
  open,
  customer,
  onClose,
  onSave,
  saving = false,
}) {
  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      {customer && (
        <EditForm
          key={customer.id}
          customer={customer}
          onClose={onClose}
          onSave={onSave}
          saving={saving}
        />
      )}
    </Dialog>
  );
}
