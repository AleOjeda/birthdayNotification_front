import { useNavigate } from "react-router";

export function useApi() {
  const navigate = useNavigate();

  // Función interna que hace el fetch + manejo de 402
  async function request(path, opts = {}) {
    const res = await fetch(`${apiUrl}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      },
      ...opts,
    });

    if (res.status === 402) {
      // Si no estás autorizado, te manda al login
      navigate("/login");
      throw new Error("No autorizado");
    }

    return res;
  }

  return {
    // GET /api/…
    get: (path, opts) => request(path, { method: "GET", ...opts }),
    // POST /api/…  con body JSON
    post: (path, body, opts) =>
      request(path, {
        method: "POST",
        body: JSON.stringify(body),
        ...opts,
      }),
    // PUT /api/…   con body JSON
    put: (path, body, opts) =>
      request(path, {
        method: "PUT",
        body: JSON.stringify(body),
        ...opts,
      }),
    // DELETE /api/…
    del: (path, opts) => request(path, { method: "DELETE", ...opts }),
  };
}
