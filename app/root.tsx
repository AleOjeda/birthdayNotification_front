import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useEffect, useState } from "react";
import { useSessionEvents } from "./lib/sessionHooks";
import { recoverFromChunkError, forceReload, useAppUpdate } from "./lib/useAppUpdate";
import { isChunkLoadError } from "./lib/versionCheck";
// El HTML nunca se cachea (ni bfcache/proxies): la sesión vive en el cliente y
// debe revalidarse. Los assets con hash los sirve el servidor estático con su
// propia caché larga; esto solo aplica a respuestas de documento.
export const headers: Route.HeadersFunction = () => ({
  "Cache-Control": "no-store",
});

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function SessionEvents() {
  const { message, open, closeNotice } = useSessionEvents();
  return (
    <Snackbar
      open={open}
      autoHideDuration={8000}
      onClose={(_, reason) => {
        if (reason !== "clickaway") closeNotice();
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert severity="warning" variant="filled" onClose={closeNotice} role="alert">
        {message}
      </Alert>
    </Snackbar>
  );
}

function AppUpdateNotice() {
  const { status, updateNow, dismiss } = useAppUpdate();
  const available = status === "available";
  const failed = status === "failed";
  return (
    <Snackbar
      open={available || failed}
      onClose={(_, reason) => {
        if (reason !== "clickaway") dismiss();
      }}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert
        severity="info"
        variant="filled"
        role="status"
        onClose={failed ? dismiss : undefined}
        action={
          available ? (
            <Button color="inherit" size="small" onClick={updateNow}>
              Actualizar ahora
            </Button>
          ) : undefined
        }
      >
        {failed
          ? "No se pudo actualizar. Recarga con Ctrl+F5"
          : "Hay una versión nueva de la app."}
      </Alert>
    </Snackbar>
  );
}

// Error de carga de módulo tras un deploy: se intenta actualizar en vez de
// mostrar el error técnico.
function ChunkErrorRecovery() {
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    let alive = true;
    recoverFromChunkError().then((reloaded) => {
      if (alive && !reloaded) setGaveUp(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <main className="pt-16 p-4 container mx-auto" role="status">
      {gaveUp ? (
        <>
          <h1>No se pudo cargar esta página</h1>
          <p>Puede que haya una versión nueva de la app o falle la conexión.</p>
          <Button variant="contained" onClick={() => forceReload()}>
            Actualizar ahora
          </Button>
        </>
      ) : (
        <h1>Actualizando la aplicación…</h1>
      )}
    </main>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SessionEvents />
      <AppUpdateNotice />
      <Outlet />
    </ThemeProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isChunkLoadError(error)) return <ChunkErrorRecovery />;
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
