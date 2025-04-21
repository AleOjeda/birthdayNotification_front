// src/pages/EditBirthday.jsx

import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  TextField,
  Button,
  Box,
  Typography,
} from "@mui/material";
import { useParams, useNavigate } from "react-router";

export default function EditBirthday() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState(null);

  // Validaciones con Yup
  const validationSchema = Yup.object().shape({
    firstName: Yup.string()
      .required("El nombre es obligatorio"),
    lastName: Yup.string()
      .required("El apellido es obligatorio"),
    birthDate: Yup.date()
      .required("La fecha de nacimiento es obligatoria"),
    phone: Yup.string()
      .required("El teléfono es obligatorio"),
    email: Yup.string()
      .email("Formato de email no válido")
      .optional(),
  });

  // Al montar el componente, cargamos la info de la persona a editar
  useEffect(() => {
    async function fetchPerson() {
      try {
        const response = await fetch(`https://EDITARAPI/${id}`);
        if (!response.ok) {
          throw new Error("Error al obtener el registro");
        }
        const data = await response.json();
        setInitialValues({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          birthDate: data.birthDate || "",
          phone: data.phone || "",
          email: data.email || "",
        });
      } catch (error) {
        console.error(error);
        alert("Hubo un problema al obtener el registro a editar.");
      }
    }

    fetchPerson();
  }, [id]);

  // Configuración de Formik
  const formik = useFormik({
    initialValues: initialValues || {
      firstName: "",
      lastName: "",
      birthDate: "",
      phone: "",
      email: "",
    },
    enableReinitialize: true, 
    validationSchema,
    onSubmit: async (values) => {
      try {
        const response = await fetch(`https://EDITARAPI/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          throw new Error("Error al editar el registro");
        }

        alert("¡Cumpleaños editado exitosamente!");
        navigate("/list"); // Redirigimos a la lista
      } catch (error) {
        console.error("Error al editar registro:", error);
        alert("Hubo un problema al editar el registro.");
      }
    },
  });

  // Si aún no cargan los datos, mostramos un indicador
  if (initialValues === null) {
    return <Typography>Cargando datos...</Typography>;
  }

  return (
    <Box sx={{ maxWidth: 400 }}>
      <Typography variant="h5" mb={2}>
        Editar Cumpleaños
      </Typography>
      <form onSubmit={formik.handleSubmit}>
        <TextField
          label="Nombre"
          variant="outlined"
          fullWidth
          name="firstName"
          margin="normal"
          value={formik.values.firstName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={
            formik.touched.firstName &&
            Boolean(formik.errors.firstName)
          }
          helperText={
            formik.touched.firstName && formik.errors.firstName
          }
        />

        <TextField
          label="Apellido"
          variant="outlined"
          fullWidth
          name="lastName"
          margin="normal"
          value={formik.values.lastName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={
            formik.touched.lastName &&
            Boolean(formik.errors.lastName)
          }
          helperText={
            formik.touched.lastName && formik.errors.lastName
          }
        />

        <TextField
          label="Fecha de Nacimiento"
          variant="outlined"
          fullWidth
          name="birthDate"
          margin="normal"
          type="date"
          InputLabelProps={{
            shrink: true,
          }}
          value={formik.values.birthDate}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={
            formik.touched.birthDate &&
            Boolean(formik.errors.birthDate)
          }
          helperText={
            formik.touched.birthDate && formik.errors.birthDate
          }
        />

        <TextField
          label="Teléfono"
          variant="outlined"
          fullWidth
          name="phone"
          margin="normal"
          value={formik.values.phone}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.phone && Boolean(formik.errors.phone)}
          helperText={formik.touched.phone && formik.errors.phone}
        />

        <TextField
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

        <Button
          type="submit"
          variant="contained"
          sx={{ mt: 2 }}
        >
          Guardar Cambios
        </Button>
      </form>
    </Box>
  );
}
