import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export async function requireAuth({ request }: LoaderFunctionArgs) {
  const cookie = request.headers.get("cookie") || "";
  const isLoggedIn = cookie.includes("token=");
  if (!isLoggedIn) {
    throw redirect("/login");
  }
}
