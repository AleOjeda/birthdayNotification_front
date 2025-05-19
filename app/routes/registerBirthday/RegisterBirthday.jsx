import { useFormik } from "formik";
import * as Yup from "yup"; // Para validaciones
import { TextField, Button, Box, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import es from "date-fns/locale/es";

export default function RegisterBirthday() {
  // Función auxiliar para capitalizar
  const toCapitalLetters = (text) =>
    text
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  // Ejemplo de validaciones con Yup
  const validationSchema = Yup.object().shape({
    name: Yup.string().required("El nombre es obligatorio"),
    last_name: Yup.string().required("El apellido es obligatorio"),
    birthday: Yup.date()
      .nullable()
      .required("La fecha de nacimiento es obligatoria"),
    phone: Yup.string()
      .matches(
        /^11\d{8}$/,
        "Verificar telefono, inicia con 11 y tiene el total?"
      )
      .required("El teléfono es obligatorio"),
    email: Yup.string().email("Formato de email no válido").optional(),
  });

  const formik = useFormik({
    initialValues: {
      name: "",
      last_name: "",
      birthday: null,
      email: "",
      phone: "",
    },
    validationSchema,
    onSubmit: async (values, { resetForm, setTouched }) => {
      const transformedValues = {
        ...values,
        name: toCapitalLetters(values.name),
        last_name: toCapitalLetters(values.last_name),
      };
      setTouched({
        name: true,
        last_name: true,
        birthday: true,
        phone: true,
        email: true,
      });

      try {
        const response = await fetch(
          `${apiUrl}/api/customers`,
          // "http://localhost:3001/api/customers",
          // "https://servidorossa.ddns.net/api/customers",
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
        <Box sx={{ maxWidth: 400 }}></Box>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <TextField
            size="small"
            label="Nombre"
            variant="outlined"
            fullWidth
            name="name"
            margin="normal"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.name && Boolean(formik.errors.name)}
            helperText={formik.touched.name && formik.errors.name}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
            sx={{
              maxWidth: "47%",
            }}
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
            sx={{ maxWidth: "47%" }}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <TextField
            size="small"
            label="Fecha de Nacimiento"
            variant="outlined"
            fullWidth
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
            sx={{
              maxWidth: "47%",
            }}
          />
          {/* <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <DatePicker
            label="Fecha de Nacimiento"
            views={["year", "month", "day"]}
            openTo="month"
            value={formik.values.birthday || null}
            onChange={(value) => {
              formik.setFieldValue("birthday", value);
              formik.setFieldTouched("birthday", true, true); // esto es clave
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                error={
                  formik.touched.birthday && Boolean(formik.errors.birthday)
                }
                name="birthday"
                margin="normal"
                size="small"
                fullWidth
                helperText={formik.touched.birthday && formik.errors.birthday}
                onBlur={formik.handleBlur}
              />
            )}
          />
        </LocalizationProvider> */}

          <TextField
            size="small"
            label="Teléfono"
            variant="outlined"
            // fullWidth
            name="phone"
            placeholder="1151234567"
            margin="normal"
            value={formik.values.phone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
            error={formik.touched.phone && Boolean(formik.errors.phone)}
            helperText={formik.touched.phone && formik.errors.phone}
            sx={{
              maxWidth: "47%",
            }}
          />
        </Box>

        <TextField
          style={{ fontSize: "5.2em" }}
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
          slotProps={{
            inputLabel: {
              shrink: true,
              // sx: { fontSize: "1.2rem" },
            },
          }}
          // inputProps={{ style: { fontSize: "5.2em" } }} // font size of input text
          // InputLabelProps={{ sx: { fontSize: "1.2rem" } }} // font size of input label
        />

        <Button type="submit" variant="contained" sx={{ mt: 2 }}>
          Guardar
        </Button>
      </form>
    </Box>
  );
}
