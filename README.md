# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

This template includes three Dockerfiles optimized for different package managers:

- `Dockerfile` - for npm
- `Dockerfile.pnpm` - for pnpm
- `Dockerfile.bun` - for bun

To build and run using Docker:

```bash
# For npm
docker build -t my-app .

# For pnpm
docker build -f Dockerfile.pnpm -t my-app .

# For bun
docker build -f Dockerfile.bun -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.


## Despliegue y actualización de versión

### Subir una versión nueva

1. Edita `version` en `package.json` (por ejemplo `2.0.0` a `2.0.1`).
2. Ejecuta `npm run build`. El build genera `build/client/version.json` con la versión y el identificador de build (tarea T15).
3. Despliega el contenido de `build/` y **reinicia el contenedor `ssr` tras cada build**: `docker compose restart ssr` (o `docker compose up -d --build ssr` si cambió la imagen). `react-router-serve` carga `build/server` al arrancar; sin reiniciar, el HTML viejo en memoria apuntaría a assets con hash que ya no existen (404 y pantalla rota).
4. `nginx -s reload` solo hace falta si cambió `nginx.conf` (archivo `nginx.conf` en la raíz del front; el compose lo monta en `/etc/nginx/nginx.conf` como `./nginx/nginx.conf`, así que cópialo a esa ruta del servidor): `docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload`.
5. Los clientes abiertos detectan la versión nueva al consultar `/version.json` (al volver a la pestaña, de forma periódica o ante un error de carga de chunk) y se recargan en un momento seguro o muestran el aviso "Actualizar".

**Advertencia:** no exportes `APP_BUILD_TIME` de forma permanente. Fija la hora de build, así que dos builds con el mismo valor tendrían la misma identidad y los clientes no detectarían la versión nueva. Si el valor no es una fecha ISO 8601 válida, el build lo ignora y avisa por consola.

### Qué hace `version.json`

Es un archivo pequeño en el mismo origen que la app. La app lo pide con `fetch('/version.json?t=...', { cache: 'no-store' })` y compara su identificador con el del build que tiene cargado. Si difiere, hay una versión nueva. Por eso nunca debe cachearse.

### Política de caché (`nginx.conf`)

nginx no usa `proxy_cache`. La cabecera `Cache-Control` se fija en un único `map` (`$cache_control`) según la ruta y el código de estado, y se descarta la que envíe el upstream (`proxy_hide_header`). Por defecto todo es `no-store`.

| Ruta | Cache-Control |
| --- | --- |
| Documento HTML y rutas de la app (`/`, `/login`, `/dashboard`...), `*.data` | `no-store` |
| `/version.json` | `no-store, no-cache, must-revalidate` |
| `/assets/<archivo.ext>` (con hash, un solo nivel, solo 200/304) | `public, max-age=31536000, immutable` |
| `/favicon.ico`, `robots.txt`, `manifest.json`, `apple-touch-icon.png`, `site.webmanifest` | `public, max-age=0, must-revalidate` |
| `/api/*` (incluido websocket) y cualquier error (404, 500...) | `no-store` |

Cabeceras de seguridad en todas las respuestas HTTPS: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`. `Strict-Transport-Security` queda comentada en `nginx.conf`: actívala solo cuando la renovación automática del certificado esté probada (el navegador forzará HTTPS durante `max-age`). nginx descarta las equivalentes que envíen el SSR o el backend para no duplicarlas. Regla de nginx a recordar: `add_header` solo se hereda a un `location` si este no define ninguno propio; por eso los `location` no usan `add_header`.

`nginx-certbot.conf` solo se usa de forma temporal para renovar el certificado (ACME y 404); no sirve la app y no necesita política de caché.

### Comprobar tras desplegar

```bash
curl -I https://<host>/version.json   # Cache-Control: no-store, no-cache, must-revalidate
curl -I https://<host>/login          # Cache-Control: no-store
curl -I https://<host>/assets/<archivo-con-hash>.js   # public, max-age=31536000, immutable
curl -I https://<host>/favicon.ico    # public, max-age=0, must-revalidate
curl -I https://<host>/assets/nope.js # debe ser 404 con Cache-Control: no-store (nunca 200)
curl -s https://<host>/version.json   # debe coincidir con build/client/version.json
```

Debe aparecer una sola cabecera `Cache-Control` en cada respuesta. Si hay un CDN delante (por ejemplo Cloudflare), configúralo para respetar las cabeceras del origen (sin "Cache Everything" ni reglas que cacheen HTML o `version.json`) y purga la caché si cambias reglas.

### Variables necesarias (sin valores secretos)

- `VITE_API_URL` (frontend, en build): URL base de la API; se inyecta al compilar, así que cambiarla exige un build nuevo.
- `CORS_ORIGINS` (backend): lista separada por comas de orígenes permitidos, sin barra final ni comodines; debe incluir el origen público del frontend.
- `TRUST_PROXY` (backend): saltos de proxy de confianza (por ejemplo `1` al ir detrás de nginx) para que el límite de peticiones y la IP del cliente sean correctos.

Los valores reales viven en los `.env` de cada proyecto y no se versionan.
