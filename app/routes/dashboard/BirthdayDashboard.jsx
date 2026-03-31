import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  Button,
  Stack,
  Chip,
  Divider,
} from "@mui/material";
import CakeIcon from "@mui/icons-material/Cake";
import { useNavigate } from "react-router";

const apiUrl = "https://servidorossa.ddns.net";

export default function BirthdayDashboard() {
  const [today, setToday] = useState([]);
  const [week, setWeek] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${apiUrl}/api/customers/birthdays/today`)
      .then((res) => res.json())
      .then(setToday);

    fetch(`${apiUrl}/api/customers/birthdays/week`)
      .then((res) => res.json())
      .then((data) => {
        setWeek(sortByProximity(data)); // 🔥 ordenamos acá
      });
  }, []);

  // 🎯 calcular próxima fecha real
  const getNextBirthdayDate = (birthday) => {
    const today = new Date();
    const b = new Date(birthday + "T00:00:00");

    let next = new Date(today.getFullYear(), b.getMonth(), b.getDate());

    // si ya pasó → usar el próximo año
    if (next < today) {
      next = new Date(today.getFullYear() + 1, b.getMonth(), b.getDate());
    }

    return next;
  };

  // 🔥 días restantes
  const getDaysUntilBirthday = (birthday) => {
    const today = new Date();
    const next = getNextBirthdayDate(birthday);

    const diffTime = next - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Mañana";
    return `En ${diffDays} días`;
  };

  // 📅 formatear fecha
  const formatDate = (birthday) => {
    const b = new Date(birthday + "T00:00:00");
    return b.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  // 🎨 color chip
  const getColor = (birthday) => {
    const d = getDaysUntilBirthday(birthday);
    if (d === "Hoy") return "error";
    if (d === "Mañana") return "warning";
    return "default";
  };

  // 🔥 ORDEN INTELIGENTE
  const sortByProximity = (list) => {
    return [...list].sort((a, b) => {
      const dateA = getNextBirthdayDate(a.birthday);
      const dateB = getNextBirthdayDate(b.birthday);
      return dateA - dateB;
    });
  };

  const renderList = (list, emptyText, isWeek = false) => (
    <List>
      {list.map((p) => (
        <ListItem
          key={p.id}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            borderRadius: 2,
            px: 2,
            py: 1,
            "&:hover": {
              backgroundColor: "#f5f5f5",
            },
          }}
        >
          {/* LEFT */}
          <Stack direction="row" spacing={1} alignItems="center">
            <CakeIcon fontSize="small" />

            <Stack>
              <Typography fontWeight="bold">
                {p.name} {p.last_name}
              </Typography>

              {isWeek && (
                <Typography fontSize={12} color="gray">
                  {formatDate(p.birthday)} • {getDaysUntilBirthday(p.birthday)}
                </Typography>
              )}
            </Stack>
          </Stack>

          {/* RIGHT */}
          <Stack direction="row" spacing={1}>
            {isWeek && (
              <Chip
                size="small"
                label={getDaysUntilBirthday(p.birthday)}
                color={getColor(p.birthday)}
              />
            )}

            {/* <Button
              size="small"
              variant="outlined"
              onClick={() =>
                navigator.clipboard.writeText(`Feliz cumple ${p.name} 🎉`)
              }
            >
              Copiar
            </Button> */}
          </Stack>
        </ListItem>
      ))}

      {list.length === 0 && (
        <Typography sx={{ px: 2, py: 1, color: "gray" }}>
          {emptyText}
        </Typography>
      )}
    </List>
  );

  return (
    <Box sx={{ maxWidth: 700 }}>
      {/* HEADER */}
      <Typography variant="h4" mb={3} fontWeight="bold">
        🎂 Cumpleaños
      </Typography>

      {/* BOTONES */}
      <Stack direction="row" spacing={2} mb={3}>
        <Button variant="contained" onClick={() => navigate("/register")}>
          ➕ Nuevo
        </Button>

        <Button variant="outlined" onClick={() => navigate("/list")}>
          📋 Ver lista
        </Button>

        <Button variant="outlined" onClick={() => navigate("/calendar")}>
          📅 Calendario
        </Button>
      </Stack>

      {/* HOY */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          borderLeft: "6px solid #1976d2",
        }}
      >
        <Stack direction="row" justifyContent="space-between" mb={1}>
          <Typography variant="h6">🔥 Hoy</Typography>
          <Chip label={`${today.length}`} color="primary" />
        </Stack>

        <Divider sx={{ mb: 1 }} />

        {renderList(today, "No hay cumpleaños hoy")}
      </Paper>

      {/* SEMANA */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderRadius: 3,
          borderLeft: "6px solid #9c27b0",
        }}
      >
        <Stack direction="row" justifyContent="space-between" mb={1}>
          <Typography variant="h6">📅 Dentro de los próximos 7 días</Typography>
          <Chip label={`${week.length}`} color="secondary" />
        </Stack>

        <Divider sx={{ mb: 1 }} />

        {renderList(
          week,
          "No hay cumpleaños dentro de los próximos 7 días",
          true,
        )}
      </Paper>
    </Box>
  );
}
