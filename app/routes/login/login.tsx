// app/routes/login.tsx
import type { ActionFunctionArgs } from "react-router";
import { Form, useActionData } from "react-router";
import { Formik } from "formik";
import * as Yup from "yup";

import Container from "@mui/material/Container";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

type ActionData = { error?: string };

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const res = await fetch(
    `${apiUrl}/api/users/login`
    // "https://servidorossa.ddns.net/api/users/login",
    // "http://localhost:3001/api/users/login",
    , {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: "Usuario o contraseña incorrectos" }),
      {
        status: 402,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { token } = await res.json();
  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": `token=${token}; Path=/; HttpOnly; SameSite=Lax; Secure`,
      Location: "/register",
    },
  });
}

export default function LoginPage() {
  const actionData = useActionData<ActionData>();
  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Iniciar Sesión
        </Typography>

        {actionData?.error && (
          <Alert severity="error" sx={{ width: "100%", mt: 2 }}>
            {actionData.error}
          </Alert>
        )}

        <Formik
          initialValues={{ username: "", password: "" }}
          validationSchema={Yup.object({
            username: Yup.string().required("Requerido"),
            password: Yup.string().required("Requerido"),
          })}
          onSubmit={() => {
            /* La petición la maneja <Form method="post"> */
          }}
          validateOnMount
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            isValid,
            isSubmitting,
          }) => (
            <Form
              method="post"
              noValidate
              style={{ width: "100%", marginTop: 16 }}
            >
              <TextField
                fullWidth
                margin="normal"
                id="username"
                name="username"
                label="Usuario"
                value={values.username}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.username && Boolean(errors.username)}
                helperText={touched.username && errors.username}
              />

              <TextField
                fullWidth
                margin="normal"
                id="password"
                name="password"
                label="Contraseña"
                type="password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.password && Boolean(errors.password)}
                helperText={touched.password && errors.password}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={!isValid || isSubmitting}
              >
                Entrar
              </Button>
            </Form>
          )}
        </Formik>
      </Box>
    </Container>
  );
}
