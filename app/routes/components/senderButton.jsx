import { useState, useEffect } from "react";
import {
Button, CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";



export default function SenderButton() {
    /** Estado para deshabilitar el botón y mostrar cuenta atrás */
  const [waitingApi, setWaitingApi] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);


   /** Cuando secondsLeft > 0, lanzamos un intervalo que va restando 1 s */
  useEffect(() => {
    if (secondsLeft === 0) {
      setWaitingApi(false); // Habilitar botón cuando termina la cuenta
      return;
    }
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    console.log(secondsLeft)
    return () => clearInterval(timer);
  }, [secondsLeft]);

  /** Manejador del click */
  const handleSendList = async () => {
    if (waitingApi) return; // Doble seguridad
    setWaitingApi(true);
setSecondsLeft(5);
    try {
      const resp = await fetch(`${apiUrl}/api/routineTask/sendWhatsappWithHappyBirthdays`, { method: "POST" });
      // const resp = await fetch("https://servidorossa.ddns.net/api/routineTask/sendWhatsappWithHappyBirthdays", { method: "POST" });
      // const resp = await fetch("http://localhost:3001/api/routineTask/sendWhatsappWithHappyBirthdays", { method: "POST" });
      if (!resp.ok) throw new Error("Error de API");
      // Aquí podrías mostrar un toast, snackbar, etc.
    } catch (err) {
      console.error(err);
      alert("No se pudo enviar el listado.");
    } 
  };

  return (
          <Button
            variant="contained"
            color="primary"
            startIcon={!waitingApi && <SendIcon />}
            endIcon={
              waitingApi && <CircularProgress size={18} color="inherit" />
            }
            disabled={waitingApi}
            fullWidth
            onClick={handleSendList}
          >
            {waitingApi
              ? `Enviando… ${secondsLeft || 0}s`
              : "Enviar listado de cumpleaños"}
          </Button>
  );
}
