import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Box from "@mui/material/Box";

// const socket = io({
const socket = io("localhost:3001", {
  path: "/api/ws/socket.io",
  transports: ["websocket"],
});

export default function WhatsappQR() {
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState("Esperando QR...");
  useEffect(() => {
    socket.on("qr", (qr) => {
      console.log("QR recibido");
      setQrCode(qr);
      setStatus("Escanea el QR con whatsapp");
    });

    socket.on("ready", () => {
      setQrCode(null);
      setStatus("Whatsapp conectado ✅");
    });

    socket.on("authenticated", () => {
      setQrCode(null);
      setStatus("Autenticado en Whatsapp ✅");
    });

    socket.on("auth_failure", (msg) => {
      setQrCode(null);
      setStatus("Error en autenticación ❌");
    });

    return () => {
      socket.off("qr");
      socket.off("ready");
      socket.off("authenticated");
      socket.off("auth_failure");
    };
  }, []);

  return (
    <>
      <Box
        sx={{
          // height: 200,
          // width: 200,
          my: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          // justifyContent: "center",
          // gap: 4,
          // p: 2,
          border: "2px solid grey",
        }}
      >
        <><h2 style={{ textAlign: "center" }}>{status}</h2></>
        {qrCode && (
          <>
            <img
              src={qrCode}
              alt="Escanea este QR con WhatsApp"
              style={{ width: 250, height: 250 }}
            />
            {/* {qrCode} */}
          </>
        )}
      </Box>
    </>
  );
}
