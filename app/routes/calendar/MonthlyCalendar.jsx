import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Card,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { getCustomers } from "../../api/customers";
import {
  MONTH_NAMES,
  ageInYear,
  birthdayDayInYear,
  sortByName,
  todayParts,
} from "../../lib/birthday";

const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DETAIL_WIDTH = 280;
const GAP = 4; // px entre celdas

// Alto de celda (px). En md+ es el MÍNIMO: las filas se estiran con el alto disponible.
const CELL = { xs: 44, sm: 58, md: 56 };
const MAX_ROWS = 6;
// Altura de la barra superior + padding del <main> en RootLayout (md: 64 + 2*32).
const CHROME_MD = 128;
// Presupuesto mínimo en md+ para 6 semanas (cabe en un viewport útil de ~600px sin scroll de
// página): cabecera h5 (32) + caption (20) + separación (8) + bordes de la tarjeta (2) +
// padding de la tarjeta (2*12) + fila de días (18 + 4) + 6*56 + 5*4 = 464 px.
const MIN_HEIGHT_MD = 464;
// Alto reservado para el Alert de error (alto ~40 + margen 8) cuando se muestra.
const ALERT_HEIGHT = 48;

const rowsHeight = (cell) => MAX_ROWS * cell + (MAX_ROWS - 1) * GAP;

const fullName = (p) => `${p.name} ${p.last_name}`;
const getInitials = (p) =>
  `${(p.name || "").charAt(0)}${(p.last_name || "").charAt(0)}`.toUpperCase();

function longDate(year, month, day, withWeekday = false) {
  return new Date(year, month, day).toLocaleDateString("es-CL", {
    ...(withWeekday && { weekday: "long" }),
    day: "numeric",
    month: "long",
  });
}

export default function MonthlyCalendar() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [view, setView] = useState(() => {
    const t = todayParts();
    return { year: t.year, month: t.month - 1 }; // month: 0-11
  });
  const requestId = useRef(0);
  const detailRef = useRef(null);

  const { year, month } = view;

  const load = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    getCustomers()
      .then((data) => {
        if (id === requestId.current) setList(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (id === requestId.current)
          setLoadError(
            err?.message ||
              "No pudimos cargar el calendario. Revisa tu conexión e inténtalo de nuevo.",
          );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  // al elegir un día, el panel de detalle (debajo del calendario en xs/sm) debe quedar a la vista
  useEffect(() => {
    const el = detailRef.current;
    if (selectedDay && el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedDay]);

  const today = todayParts();
  const isToday = (day) =>
    day === today.day && month === today.month - 1 && year === today.year;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const trailing = weeks * 7 - offset - daysInMonth;

  // cumpleaños del mes mostrado agrupados por día (por birth_day/birth_month, no por `birthday`)
  const byDay = useMemo(() => {
    const map = new Map();
    for (const p of sortByName(list)) {
      if (p.birth_month !== month + 1) continue;
      const day = birthdayDayInYear(p, year);
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(p);
    }
    return map;
  }, [list, month, year]);

  const monthBirthdays = loading || loadError
    ? 0
    : [...byDay.values()].reduce((acc, arr) => acc + arr.length, 0);

  const changeMonth = (dir) => {
    const d = new Date(year, month + dir, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
    setSelectedDay(null);
  };

  const goToday = () => {
    const t = todayParts();
    setView({ year: t.year, month: t.month - 1 });
    setSelectedDay(null);
  };

  const monthName = `${MONTH_NAMES[month]} ${year}`;

  const subtitle = loading
    ? "Cargando cumpleaños..."
    : loadError
      ? "No se pudo cargar el calendario"
      : monthBirthdays === 0
        ? "Sin cumpleaños este mes"
        : `${monthBirthdays} cumpleaños este mes`;

  const selectedBirthdays = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  const gridSx = {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: `${GAP}px`,
  };
  const rowsSx = (count) => ({
    gridTemplateRows: {
      xs: `repeat(${count}, ${CELL.xs}px)`,
      sm: `repeat(${count}, ${CELL.sm}px)`,
      md: `repeat(${count}, minmax(${CELL.md}px, 1fr))`,
    },
  });

  return (
    <Box
      sx={{
        maxWidth: 1100,
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        minHeight: { md: MIN_HEIGHT_MD + (loadError ? ALERT_HEIGHT : 0) },
        height: { md: `calc(100dvh - ${CHROME_MD}px)` },
      }}
    >
      {/* CABECERA + NAVEGACIÓN en la misma fila */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        columnGap={2}
        rowGap={0.5}
        mb={1}
        sx={{ flexShrink: 0 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="h1" noWrap>
            <span aria-hidden>📅</span> Calendario
          </Typography>
          <Typography variant="caption" color="text.secondary" component="p">
            {subtitle}
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton
            size="small"
            aria-label="Mes anterior"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeftIcon />
          </IconButton>
          <Typography
            variant="subtitle1"
            component="h2"
            aria-live="polite"
            align="center"
            sx={{
              textTransform: "capitalize",
              fontWeight: 700,
              minWidth: { xs: 120, sm: 140 },
            }}
          >
            {monthName}
          </Typography>
          <IconButton
            size="small"
            aria-label="Mes siguiente"
            onClick={() => changeMonth(1)}
          >
            <ChevronRightIcon />
          </IconButton>
          <Button size="small" variant="outlined" onClick={goToday}>
            Hoy
          </Button>
        </Stack>
      </Stack>

      {loadError && (
        <Alert
          severity="error"
          sx={{ mb: 1, py: 0, flexShrink: 0 }}
          action={
            <Button color="inherit" size="small" onClick={load}>
              Reintentar
            </Button>
          }
        >
          {loadError}
        </Alert>
      )}

      {/* CALENDARIO + DETALLE (al costado en md+) */}
      <Box
        sx={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: `minmax(0, 1fr) ${DETAIL_WIDTH}px`,
          },
          gridTemplateRows: { md: "minmax(0, 1fr)" },
        }}
      >
        <Card
          sx={{
            p: { xs: 0.75, sm: 1.5 },
            minHeight: 0,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ENCABEZADOS DE DÍAS */}
          <Box sx={{ ...gridSx, mb: `${GAP}px`, flexShrink: 0 }}>
            {WEEK_DAYS.map((d) => (
              <Typography
                key={d}
                align="center"
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{ lineHeight: "18px" }}
              >
                {d}
              </Typography>
            ))}
          </Box>

          {/* CUADRÍCULA: se reserva el alto de 6 semanas para que no salte entre meses */}
          <Box
            sx={{
              flex: "1 1 auto",
              minHeight: {
                xs: rowsHeight(CELL.xs),
                sm: rowsHeight(CELL.sm),
                md: 0,
              },
              display: "flex",
            }}
          >
            {loading ? (
              <Box
                role="status"
                aria-label="Cargando"
                sx={{ ...gridSx, ...rowsSx(5), width: "100%", alignContent: "start" }}
              >
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    variant="rounded"
                    sx={{ height: "100%", transform: "none" }}
                  />
                ))}
              </Box>
            ) : (
              <Box
                sx={{
                  ...gridSx,
                  ...rowsSx(weeks),
                  width: "100%",
                  alignContent: "start",
                }}
              >
                {Array.from({ length: offset }).map((_, i) => (
                  <Box key={`prev-${i}`} aria-hidden />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const birthdays = loadError ? [] : (byDay.get(day) ?? []);
                  const todayCell = isToday(day);
                  const selected = selectedDay === day;
                  const dateLabel = longDate(year, month, day, true);
                  const label =
                    birthdays.length > 0
                      ? `${dateLabel}${todayCell ? " (hoy)" : ""}: cumpleaños de ${birthdays
                          .map(fullName)
                          .join(", ")}`
                      : `${dateLabel}${todayCell ? " (hoy)" : ""}: sin cumpleaños`;

                  const cell = (
                    <ButtonBase
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      aria-label={label}
                      aria-pressed={selected}
                      aria-current={todayCell ? "date" : undefined}
                      sx={(t) => ({
                        p: { xs: 0.25, sm: 0.5 },
                        borderRadius: 1.5,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                        justifyContent: "flex-start",
                        textAlign: "left",
                        minWidth: 0,
                        minHeight: 0,
                        overflow: "hidden",
                        border: `1px solid ${
                          selected
                            ? t.palette.primary.main
                            : todayCell
                              ? t.palette.primary.light
                              : t.palette.divider
                        }`,
                        bgcolor: selected
                          ? alpha(t.palette.primary.main, 0.14)
                          : todayCell
                            ? alpha(t.palette.primary.main, 0.1)
                            : "background.paper",
                        transition: "background-color .15s",
                        "&:hover": {
                          bgcolor: alpha(t.palette.primary.main, 0.08),
                        },
                        "&.Mui-focusVisible": {
                          outline: `2px solid ${t.palette.primary.main}`,
                          outlineOffset: 1,
                        },
                      })}
                    >
                      <Box
                        aria-hidden
                        sx={{ display: "flex", justifyContent: "flex-end" }}
                      >
                        <Typography
                          variant="caption"
                          component="span"
                          sx={(t) => ({
                            fontWeight: 700,
                            minWidth: 20,
                            height: 20,
                            lineHeight: "20px",
                            textAlign: "center",
                            borderRadius: "50%",
                            ...(todayCell && {
                              bgcolor: "primary.main",
                              color: t.palette.primary.contrastText,
                            }),
                          })}
                        >
                          {day}
                        </Typography>
                      </Box>

                      {birthdays.length > 0 && (
                        <>
                          {/* sm+: 1 nombre corto + "+N" */}
                          <Stack
                            aria-hidden
                            spacing={0.25}
                            sx={{
                              display: { xs: "none", sm: "flex" },
                              minWidth: 0,
                            }}
                          >
                            <Box
                              sx={{
                                fontSize: 11,
                                lineHeight: "16px",
                                bgcolor: "primary.main",
                                color: "primary.contrastText",
                                px: 0.5,
                                borderRadius: 0.75,
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {birthdays[0].name}
                            </Box>
                            {birthdays.length > 1 && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontSize: 11, lineHeight: "12px" }}
                              >
                                +{birthdays.length - 1}
                              </Typography>
                            )}
                          </Stack>

                          {/* xs: contador */}
                          <Box
                            aria-hidden
                            sx={{
                              display: { xs: "flex", sm: "none" },
                              justifyContent: "center",
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 16,
                                height: 16,
                                fontSize: 10,
                                fontWeight: 700,
                                bgcolor: "primary.main",
                                color: "primary.contrastText",
                              }}
                            >
                              {birthdays.length}
                            </Avatar>
                          </Box>
                        </>
                      )}
                    </ButtonBase>
                  );

                  return cell;
                })}

                {Array.from({ length: trailing }).map((_, i) => (
                  <Box key={`next-${i}`} aria-hidden />
                ))}
              </Box>
            )}
          </Box>
        </Card>

        {/* DETALLE: al costado en md+ (siempre), debajo en pantallas pequeñas (solo con día elegido) */}
        <Card
          component="aside"
          ref={detailRef}
          aria-live="polite"
          aria-label="Detalle del día"
          sx={{
            display: { xs: selectedDay && !loading ? "block" : "none", md: "block" },
            p: 1.5,
            minHeight: 0,
            overflowY: "auto",
            position: { md: "sticky" },
            top: { md: 0 },
            alignSelf: { md: "stretch" },
          }}
        >
          {!selectedDay || loading ? (
            <Typography variant="body2" color="text.secondary">
              Selecciona un día para ver sus cumpleaños.
            </Typography>
          ) : (
            <>
              <Typography
                component="h2"
                variant="subtitle2"
                fontWeight={700}
                mb={1}
              >
                <span aria-hidden>🎂</span> Cumpleaños el{" "}
                {longDate(year, month, selectedDay)}
              </Typography>

              {selectedBirthdays.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No hay cumpleaños
                </Typography>
              ) : (
                <Stack component="ul" spacing={1} sx={{ listStyle: "none", m: 0, p: 0 }}>
                  {selectedBirthdays.map((p) => {
                    const turning = ageInYear(p, year);
                    return (
                      <Stack
                        component="li"
                        key={p.id}
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                      >
                        <Avatar
                          aria-hidden
                          sx={{
                            width: 32,
                            height: 32,
                            fontSize: 13,
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            fontWeight: 700,
                          }}
                        >
                          {getInitials(p)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700}>
                            {fullName(p)}
                          </Typography>
                          {turning !== null && turning > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              (cumple {turning})
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </>
          )}
        </Card>
      </Box>
    </Box>
  );
}
