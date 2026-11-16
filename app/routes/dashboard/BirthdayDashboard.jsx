import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CakeIcon from "@mui/icons-material/Cake";
import EventIcon from "@mui/icons-material/Event";
import AddIcon from "@mui/icons-material/Add";
import ListAltIcon from "@mui/icons-material/ListAlt";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { Link } from "react-router";
import { getBirthdaysToday, getBirthdaysWeek } from "../../api/customers";
import {
  daysUntilLabel,
  formatDayMonth,
  sortByNextBirthday,
  turningAgeLabel,
} from "../../lib/birthday";

const getInitials = (p) =>
  `${(p.name || "").charAt(0)}${(p.last_name || "").charAt(0)}`.toUpperCase();

const errorMessage = (e) =>
  e?.message ||
  "No pudimos cargar los cumpleaños. Revisa tu conexión e inténtalo de nuevo.";

function KpiCard({ icon, label, value, color, loading }) {
  return (
    <Card sx={{ p: 2.5, flex: 1 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar
          sx={(t) => ({
            width: 52,
            height: 52,
            bgcolor: alpha(t.palette[color].main, 0.12),
            color: `${color}.main`,
          })}
        >
          {icon}
        </Avatar>
        <Box>
          {loading ? (
            <Skeleton width={40} height={40} />
          ) : (
            <Typography variant="h4" component="p" lineHeight={1.1}>
              {value}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}

function PersonRow({ person }) {
  const isToday = person.days_until === 0;
  const details = [
    formatDayMonth(person.birth_day, person.birth_month),
    turningAgeLabel(person),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Box
      component="li"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        px: 2,
        py: 1.5,
        borderRadius: 3,
        transition: "background-color .15s",
        "&:hover": (t) => ({ bgcolor: alpha(t.palette.primary.main, 0.06) }),
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" minWidth={0}>
        <Avatar
          sx={{
            bgcolor: isToday ? "secondary.main" : "primary.main",
            color: isToday ? "secondary.contrastText" : "primary.contrastText",
            fontWeight: 700,
          }}
        >
          {getInitials(person)}
        </Avatar>
        <Box minWidth={0}>
          <Typography fontWeight={700} noWrap>
            {person.name} {person.last_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {details}
          </Typography>
        </Box>
      </Stack>

      {isToday ? (
        <Chip
          size="small"
          color="secondary"
          label={
            <>
              {daysUntilLabel(0)} <span aria-hidden>🎉</span>
            </>
          }
        />
      ) : (
        <Chip
          size="small"
          label={daysUntilLabel(person.days_until)}
          color={person.days_until === 1 ? "warning" : "default"}
          variant={person.days_until === 1 ? "filled" : "outlined"}
        />
      )}
    </Box>
  );
}

export default function BirthdayDashboard() {
  const [today, setToday] = useState([]);
  const [week, setWeek] = useState([]);
  const [todayError, setTodayError] = useState(null);
  const [weekError, setWeekError] = useState(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const load = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setTodayError(null);
    setWeekError(null);

    Promise.allSettled([getBirthdaysToday(), getBirthdaysWeek()]).then(
      ([todayRes, weekRes]) => {
        if (id !== requestId.current) return; // respuesta obsoleta
        if (todayRes.status === "fulfilled") {
          setToday(Array.isArray(todayRes.value) ? todayRes.value : []);
        } else {
          setToday([]);
          setTodayError(errorMessage(todayRes.reason));
        }
        if (weekRes.status === "fulfilled") {
          setWeek(Array.isArray(weekRes.value) ? weekRes.value : []);
        } else {
          setWeek([]);
          setWeekError(errorMessage(weekRes.reason));
        }
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  // /week incluye a los de hoy (days_until 0). Se excluyen de "Próximos" para no repetir a
  // la persona (ya aparece en "Hoy"); el KPI "Próximos 7 días" cuenta lo mismo que la lista.
  const upcoming = sortByNextBirthday(week.filter((p) => p.days_until > 0));

  const bothFailed = Boolean(todayError && weekError);
  const partialError = bothFailed ? null : todayError || weekError;

  const renderSection = (title, icon, list, emptyEmoji, emptyText, error) => (
    <Card sx={{ p: { xs: 2, md: 3 }, flex: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
        <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
        <Typography variant="h6" component="h2" flexGrow={1}>
          {title}
        </Typography>
        {!loading && !error && (
          <Chip size="small" color="primary" label={list.length} />
        )}
      </Stack>

      {loading ? (
        <Stack spacing={1.5} aria-label="Cargando" role="status">
          {[0, 1, 2].map((i) => (
            <Stack key={i} direction="row" spacing={2} alignItems="center">
              <Skeleton variant="circular" width={40} height={40} />
              <Box flexGrow={1}>
                <Skeleton width="60%" />
                <Skeleton width="30%" />
              </Box>
            </Stack>
          ))}
        </Stack>
      ) : error ? (
        <Typography color="text.secondary" variant="body2">
          Sin datos disponibles.
        </Typography>
      ) : list.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography fontSize={44} aria-hidden component="div">
            {emptyEmoji}
          </Typography>
          <Typography color="text.secondary">{emptyText}</Typography>
        </Box>
      ) : (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {list.map((p) => (
            <PersonRow key={p.id} person={p} />
          ))}
        </Box>
      )}
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      {/* HEADER */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" component="h1">
            <span aria-hidden>🎂</span> Cumpleaños
          </Typography>
          <Typography color="text.secondary">
            Hoy y los próximos 7 días (sin repetir a los de hoy)
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            component={Link}
            to="/register"
            variant="contained"
            startIcon={<AddIcon />}
          >
            Nuevo
          </Button>
          <Button
            component={Link}
            to="/list"
            variant="outlined"
            startIcon={<ListAltIcon />}
          >
            Ver lista
          </Button>
          <Button
            component={Link}
            to="/calendar"
            variant="outlined"
            startIcon={<CalendarMonthIcon />}
          >
            Calendario
          </Button>
        </Stack>
      </Stack>

      {(bothFailed || partialError) && (
        <Alert
          severity={bothFailed ? "error" : "warning"}
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={load}>
              Reintentar
            </Button>
          }
        >
          {bothFailed ? todayError : partialError}
        </Alert>
      )}

      {/* KPIs */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
        <KpiCard
          icon={<CakeIcon />}
          label="Cumpleaños hoy"
          value={todayError ? "—" : today.length}
          color="secondary"
          loading={loading}
        />
        <KpiCard
          icon={<EventIcon />}
          label="Próximos 7 días"
          value={weekError ? "—" : upcoming.length}
          color="primary"
          loading={loading}
        />
      </Stack>

      {/* LISTAS */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems="stretch"
      >
        {renderSection("Hoy", <CakeIcon />, today, "🎈", "No hay cumpleaños hoy", todayError)}
        {renderSection(
          "Próximos 7 días",
          <EventIcon />,
          upcoming,
          "📅",
          "No hay cumpleaños dentro de los próximos 7 días",
          weekError,
        )}
      </Stack>
    </Box>
  );
}
