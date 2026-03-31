import { useFormik } from "formik";
import * as Yup from "yup";
import {
  TextField,
  Button,
  Box,
  Typography,
  Paper,
  Stack,
} from "@mui/material";

const apiUrl = "https://servidorossa.ddns.net";

export default function RegisterBirthday() {
  const validationSchema = Yup.object().shape({
    name: Yup.string().required("Requerido"),
    last_name: Yup.string().required("Requerido"),
    birthday: Yup.date().required("Requerido"),
  });

  const formik = useFormik({
    initialValues: {
      name: "",
      last_name: "",
      birthday: "",
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        const response = await fetch(`${apiUrl}/api/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!response.ok) throw new Error();

        resetForm();
      } catch {
        alert("Error al guardar");
      }
    },
  });

  return (
    <Box sx={{ maxWidth: 500 }}>
      <Typography variant="h4" mb={3} fontWeight="bold">
        ➕ Nuevo cumpleaños
      </Typography>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="Nombre"
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            error={formik.touched.name && Boolean(formik.errors.name)}
            helperText={formik.errors.name}
            fullWidth
          />

          <TextField
            label="Apellido"
            name="last_name"
            value={formik.values.last_name}
            onChange={formik.handleChange}
            error={formik.touched.last_name && Boolean(formik.errors.last_name)}
            helperText={formik.errors.last_name}
            fullWidth
          />

          <TextField
            type="date"
            label="Fecha"
            name="birthday"
            InputLabelProps={{ shrink: true }}
            value={formik.values.birthday}
            onChange={formik.handleChange}
            error={formik.touched.birthday && Boolean(formik.errors.birthday)}
            helperText={formik.errors.birthday}
            fullWidth
          />

          <Button
            variant="contained"
            size="large"
            onClick={formik.handleSubmit}
          >
            Guardar
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
