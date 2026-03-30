import { useEffect, useState } from "react";
import { Box, Typography, Paper, Grid, Stack, IconButton } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

const apiUrl = "http://localhost:3001";

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function MonthlyCalendar() {
  const [list, setList] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    fetch(`${apiUrl}/api/customers`)
      .then((res) => res.json())
      .then(setList);
  }, []);

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  const today = new Date();

  const isToday = (day) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const getBirthdaysForDay = (day) => {
    return list.filter((p) => {
      const b = new Date(p.birthday + "T00:00:00");
      return b.getDate() === day && b.getMonth() === month;
    });
  };

  const changeMonth = (dir) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(month + dir);
    setCurrentDate(newDate);
    setSelectedDay(null);
  };

  const monthName = currentDate.toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
  });

  return (
    <Box sx={{ maxWidth: 1000 }}>
      {/* HEADER */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <IconButton onClick={() => changeMonth(-1)}>
          <ArrowBackIosNewIcon />
        </IconButton>

        <Typography variant="h4" fontWeight="bold">
          {monthName}
        </Typography>

        <IconButton onClick={() => changeMonth(1)}>
          <ArrowForwardIosIcon />
        </IconButton>
      </Stack>

      {/* WEEK HEADER */}
      <Grid container>
        {weekDays.map((d) => (
          <Grid item xs key={d}>
            <Typography align="center" fontSize={14} color="gray" mb={1}>
              {d}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* CALENDAR GRID */}
      <Grid container>
        {/* OFFSET */}
        {Array.from({ length: offset }).map((_, i) => (
          <Grid item xs key={`empty-${i}`}>
            <Box sx={{ height: 110 }} />
          </Grid>
        ))}

        {/* DAYS */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const birthdays = getBirthdaysForDay(day);

          return (
            <Grid item xs key={day}>
              <Paper
                onClick={() => setSelectedDay(day)}
                sx={{
                  height: 110,
                  borderRadius: 0,
                  border: "1px solid #eee",
                  p: 1,
                  cursor: "pointer",
                  backgroundColor: isToday(day) ? "#e3f2fd" : "white",
                  "&:hover": {
                    backgroundColor: "#f5f5f5",
                  },
                }}
              >
                {/* NUMERO */}
                <Typography align="right" fontSize={14} fontWeight="bold">
                  {day}
                </Typography>

                {/* EVENTOS */}
                <Stack spacing={0.5} mt={1}>
                  {birthdays.slice(0, 2).map((p) => (
                    <Box
                      key={p.id}
                      sx={{
                        fontSize: 11,
                        background: "#1976d2",
                        color: "white",
                        px: 0.5,
                        borderRadius: 1,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      🎂 {p.name}
                    </Box>
                  ))}

                  {birthdays.length > 2 && (
                    <Typography fontSize={10} color="gray">
                      +{birthdays.length - 2} más
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* DETALLE */}
      {selectedDay && (
        <Paper sx={{ mt: 3, p: 2, borderRadius: 2 }}>
          <Typography fontWeight="bold" mb={1}>
            🎂 Cumpleaños el día {selectedDay}
          </Typography>

          {getBirthdaysForDay(selectedDay).map((p) => (
            <Typography key={p.id}>
              {p.name} {p.last_name}
            </Typography>
          ))}

          {getBirthdaysForDay(selectedDay).length === 0 && (
            <Typography color="gray">No hay cumpleaños</Typography>
          )}
        </Paper>
      )}
    </Box>
  );
}
