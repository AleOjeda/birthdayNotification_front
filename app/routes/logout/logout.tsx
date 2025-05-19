import { redirect } from "react-router";

export async function loader() {
  return redirect("/login", {
    headers: {
      "Set-Cookie": "token=; Path=/; Max-Age=0;",
    },
  });
}

export default function Logout() {
  // Este componente no renderiza nada: la lógica está en el loader
  return null;
}
