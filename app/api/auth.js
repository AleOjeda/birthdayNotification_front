import { request } from "./http";
import { clearSession, setSession } from "../lib/session";

export async function login(identifier, password) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: { identifier, password },
  });
  setSession(data);
  return data.user;
}

export const getMe = async () => (await request("/api/auth/me")).user;

export async function logout() {
  try {
    await request("/api/auth/logout", { method: "POST", handleUnauthorized: false });
  } catch {
    /* red caída o sesión ya inválida: igualmente se cierra localmente */
  } finally {
    clearSession();
  }
}

export async function changePassword(currentPassword, newPassword) {
  const data = await request("/api/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
  setSession(data);
  return data.user;
}
