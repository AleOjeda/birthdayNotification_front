import type { Route } from "./+types/home";
import  WhatsappQR from "../components/whatsappQR";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Outlet } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}
import type { LoaderFunctionArgs } from "react-router";
import { requireAuth } from "../../utils/auth.server";

export async function loader(args: LoaderFunctionArgs) {
  await requireAuth(args);
  return null;
}

export default function Home() {
  return <>
  <h1>test</h1>
  {/* <WhatsappQR /> */}
  <Outlet />
  </>
}
