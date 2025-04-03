import type { Route } from "./+types/home";
import  WhatsappQR from "./components/whatsappQR";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return <>
  <WhatsappQR />
  </>
}
