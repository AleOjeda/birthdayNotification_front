import { useFormik } from "formik";
import * as Yup from "yup"; // Para validaciones
import { TextField, Button, Box, Typography } from "@mui/material";

export default function RegisterBirthday() {
  // Ejemplo de validaciones con Yup
  const validationSchema = Yup.object().shape({
    name: Yup.string().required("El nombre es obligatorio"),
    last_name: Yup.string().required("El apellido es obligatorio"),
    birthday: Yup.date().required("La fecha de nacimiento es obligatoria"),
    phone: Yup.string().required("El teléfono es obligatorio"),
    email: Yup.string().email("Formato de email no válido").optional(),
  });

  const formik = useFormik({
    initialValues: {
      user_id: 1,
      name: "",
      last_name: "",
      birthday: "",
      email: "",
      phone: "",
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        // const response = await fetch("https://CREARAPI", {
        const response = await fetch(
          "https://servidorossa.ddns.net/api/customers",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(values),
          }
        );

        if (!response.ok) {
          throw new Error("Error al crear el registro");
        }

        // Si la creación fue exitosa:
        console.log("Registro creado:", values);
        resetForm();
        alert("¡Cumpleaños registrado exitosamente!");
      } catch (error) {
        console.error("Error al crear registro:", error);
        alert("Hubo un problema al crear el registro.");
      }
    },
  });

  return (
    <Box sx={{ maxWidth: 400 }}>
      <Typography variant="h5" mb={2}>
        Registrar Cumpleaños
      </Typography>
      <form onSubmit={formik.handleSubmit}>
        <TextField
          size="small"
          label="Nombre"
          variant="outlined"
          // fullWidth
          name="name"
          margin="normal"
          value={formik.values.name}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.name && Boolean(formik.errors.name)}
          helperText={formik.touched.name && formik.errors.name}
          sx={{ maxWidth: "45%" }}
        />

        <TextField
          size="small"
          label="Apellido"
          variant="outlined"
          // fullWidth
          name="last_name"
          margin="normal"
          value={formik.values.last_name}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.last_name && Boolean(formik.errors.last_name)}
          helperText={formik.touched.last_name && formik.errors.last_name}
          sx={{ maxWidth: "45%" }}
        />

        <TextField
          size="small"
          label="Fecha de Nacimiento"
          variant="outlined"
          // fullWidth
          name="birthday"
          margin="normal"
          type="date"
          InputLabelProps={{
            shrink: true,
          }}
          value={formik.values.birthday}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.birthday && Boolean(formik.errors.birthday)}
          helperText={formik.touched.birthday && formik.errors.birthday}
        />

        <TextField
          size="small"
          label="Teléfono"
          variant="outlined"
          // fullWidth
          name="phone"
          margin="normal"
          value={formik.values.phone}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.phone && Boolean(formik.errors.phone)}
          helperText={formik.touched.phone && formik.errors.phone}
        />

        <TextField
          size="small"
          label="Correo (opcional)"
          variant="outlined"
          fullWidth
          name="email"
          margin="normal"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.email && Boolean(formik.errors.email)}
          helperText={formik.touched.email && formik.errors.email}
        />

        <Button type="submit" variant="contained" sx={{ mt: 2 }}>
          Guardar
        </Button>
      </form>
    </Box>
  );
}
