import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Outlet } from "react-router";

import type { LoaderFunctionArgs } from "react-router";

export async function loader(args: LoaderFunctionArgs) {
  return null;
}

export default function Home() {
  return (
    <>
      <h1>test</h1>
      {/* <WhatsappQR /> */}
      <Outlet />
    </>
  );
}
