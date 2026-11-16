import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import EditBirthdayModal from "./EditBirthdayModal";
import {
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from "../../api/customers";
import { useUnsavedChanges } from "../../lib/unsavedChanges";
import {
  daysUntilLabel,
  formatDayMonth,
  normalizeText,
  sortByName,
  sortByNextBirthday,
  turningAgeLabel,
} from "../../lib/birthday";

const SORTS = { next: sortByNextBirthday, name: sortByName };
const SOON_DAYS = 7;
// Altura que ocupan la barra superior (Toolbar) y el padding del <main> en RootLayout
// (xs: 56+2*16, sm: 64+2*16, md: 64+2*32). El contenedor ocupa el alto restante y solo
// la lista hace scroll, por lo que no hay doble barra de scroll.
const CHROME_HEIGHT = { xs: "88px", sm: "96px", md: "128px" };
// Botones de acción: área táctil ~40px en xs (20px icono + 2*10px), compactos desde sm.
const actionSx = { p: { xs: 1.25, sm: 0.625 } };

const getInitials = (p) =>
  `${(p.name || "").charAt(0)}${(p.last_name || "").charAt(0)}`.toUpperCase();

function DaysChip({ days }) {
  if (typeof days !== "number") return null;
  const soon = days <= SOON_DAYS;
  return (
    <Chip
      size="small"
      label={daysUntilLabel(days)}
      color={soon ? "primary" : "default"}
      variant={days === 0 ? "filled" : "outlined"}
      sx={{ flexShrink: 0, fontWeight: soon ? 700 : 400, height: 22 }}
    />
  );
}

export default function BirthdayList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("next");
  const [toDelete, setToDelete] = useState(null);
  const [deletedName, setDeletedName] = useState(""); // persiste durante la animación de salida
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { severity, message }

  // El modal de edición y la confirmación de borrado abiertos son trabajo en curso.
  useUnsavedChanges(open);
  useUnsavedChanges(Boolean(toDelete));

  const searchRef = useRef(null);
  const titleRef = useRef(null);
  const focusAfterClose = useRef(false);
  // contador de petición: solo la última respuesta se aplica; al desmontar se invalida todo
  const requestId = useRef(0);

  // carga inicial / reintento (con skeleton)
  const load = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    getCustomers()
      .then((data) => {
        if (id === requestId.current) setList(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (id === requestId.current)
          setLoadError(
            "No pudimos cargar la lista. Revisa tu conexión e inténtalo de nuevo.",
          );
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, []);

  // recarga sin skeleton tras editar/eliminar: el backend recalcula days_until, age y turning_age
  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const data = await getCustomers();
      if (id === requestId.current) {
        setList(Array.isArray(data) ? data : []);
        setLoading(false);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  // orden (siempre sobre datos del backend) y luego filtro
  const filteredList = useMemo(() => {
    const term = normalizeText(search.trim());
    return SORTS[sortMode](list).filter((p) =>
      normalizeText(`${p.name} ${p.last_name}`).includes(term),
    );
  }, [list, search, sortMode]);

  const openModal = (p) => {
    setSelectedPerson(p);
    setOpen(true);
  };

  const handleSave = async (payload) => {
    if (saving || !selectedPerson) return;
    setSaving(true);
    try {
      await updateCustomer(selectedPerson.id, payload);
      setOpen(false);
      const ok = await refresh();
      setFeedback(
        ok
          ? { severity: "success", message: "Cambios guardados correctamente." }
          : {
              severity: "warning",
              message:
                "Se guardaron los cambios, pero no pudimos actualizar la lista. Recarga la página.",
            },
      );
    } catch (err) {
      setFeedback({
        severity: "error",
        message: err?.message || "No pudimos guardar los cambios.",
      });
    } finally {
      setSaving(false);
    }
  };

  // borrar (tras confirmar)
  const handleDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteCustomer(toDelete.id);
      setToDelete(null);
      // el botón que abrió el diálogo desaparecerá: al terminar de cerrarse, el foco pasa al buscador
      focusAfterClose.current = true;
      const ok = await refresh();
      setFeedback(
        ok
          ? { severity: "success", message: "Cumpleaños eliminado." }
          : {
              severity: "warning",
              message:
                "Se eliminó el registro, pero no pudimos actualizar la lista. Recarga la página.",
            },
      );
    } catch (err) {
      setFeedback({
        severity: "error",
        message: err?.message || "No pudimos eliminar el registro.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const subtitle = loading
    ? "Cargando cumpleaños..."
    : loadError
      ? "No se pudo cargar la lista"
      : plural(list.length, "persona registrada", "personas registradas") +
        (search && filteredList.length !== list.length
          ? ` · ${plural(filteredList.length, "coincidencia", "coincidencias")}`
          : "");

  return (
    <Box
      sx={{
        maxWidth: 760,
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        minHeight: 360,
        height: {
          xs: `calc(100dvh - ${CHROME_HEIGHT.xs})`,
          sm: `calc(100dvh - ${CHROME_HEIGHT.sm})`,
          md: `calc(100dvh - ${CHROME_HEIGHT.md})`,
        },
      }}
    >
      {/* HEADER */}
      <Box mb={2}>
        <Typography
          variant="h4"
          component="h1"
          tabIndex={-1}
          ref={titleRef}
          sx={{ outline: "none" }}
        >
          <span aria-hidden>📋</span> Lista de cumpleaños
        </Typography>
        <Typography color="text.secondary">{subtitle}</Typography>
      </Box>

      {/* BUSCADOR Y ORDEN */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        mb={2}
        alignItems={{ sm: "center" }}
      >
        <TextField
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          size="small"
          slotProps={{
            htmlInput: { "aria-label": "Buscar por nombre", ref: searchRef },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={sortMode}
          onChange={(_, next) => next && setSortMode(next)}
          aria-label="Ordenar por"
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="next" sx={{ whiteSpace: "nowrap", px: 1.5 }}>
            Próximos
          </ToggleButton>
          <ToggleButton value="name" sx={{ whiteSpace: "nowrap", px: 1.5 }}>
            Nombre A–Z
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {loadError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={load}>
              Reintentar
            </Button>
          }
        >
          {loadError}
        </Alert>
      )}

      <Card
        sx={{
          p: { xs: 0.5, md: 1 },
          flex: "1 1 auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading ? (
          <Stack spacing={1} p={1} role="status" aria-label="Cargando">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Stack key={i} direction="row" spacing={1.5} alignItems="center">
                <Skeleton variant="circular" width={32} height={32} />
                <Box flexGrow={1}>
                  <Skeleton width="55%" />
                </Box>
              </Stack>
            ))}
          </Stack>
        ) : loadError ? (
          <Typography color="text.secondary" variant="body2" p={2}>
            Sin datos disponibles.
          </Typography>
        ) : filteredList.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 5 }}>
            <Typography fontSize={44} aria-hidden component="div">
              {list.length === 0 ? "🎈" : "🔍"}
            </Typography>
            <Typography color="text.secondary">
              {list.length === 0
                ? "Aún no hay cumpleaños registrados"
                : "No se encontraron resultados"}
            </Typography>
          </Box>
        ) : (
          <Box
            component="ul"
            sx={{
              listStyle: "none",
              m: 0,
              p: 0,
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            {filteredList.map((p) => {
              const fullName = `${p.name} ${p.last_name}`;
              const turning = turningAgeLabel(p);
              return (
                <Box
                  component="li"
                  key={p.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: { xs: 0.5, sm: 1 },
                    py: 0.125,
                    borderRadius: 2,
                    transition: "background-color .15s",
                    "&:hover": (t) => ({
                      bgcolor: alpha(t.palette.primary.main, 0.06),
                    }),
                  }}
                >
                  <Avatar
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

                  {/* escritorio: una línea; móvil: nombre y debajo fecha / "cumple N" */}
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      alignItems: { sm: "center" },
                      columnGap: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      noWrap
                      sx={{ flex: { sm: 1 }, minWidth: 0 }}
                    >
                      {fullName}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ flexShrink: 0, minWidth: 0 }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ minWidth: { sm: 48 } }}
                      >
                        {formatDayMonth(p.birth_day, p.birth_month)}
                      </Typography>
                      {turning && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          {turning}
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  <DaysChip days={p.days_until} />

                  <Stack direction="row" flexShrink={0}>
                    <Tooltip title="Editar">
                      <IconButton
                        size="medium"
                        sx={actionSx}
                        aria-label={`Editar ${fullName}`}
                        color="primary"
                        onClick={() => openModal(p)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton
                        size="medium"
                        sx={actionSx}
                        aria-label={`Eliminar ${fullName}`}
                        color="error"
                        onClick={() => {
                          setDeletedName(fullName);
                          setToDelete(p);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              );
            })}
          </Box>
        )}
      </Card>

      {/* MODAL EDICIÓN */}
      <EditBirthdayModal
        open={open}
        customer={selectedPerson}
        saving={saving}
        onClose={() => setOpen(false)}
        onSave={handleSave}
      />

      {/* CONFIRMAR ELIMINACIÓN */}
      <Dialog
        open={Boolean(toDelete)}
        onClose={deleting ? undefined : () => setToDelete(null)}
        slotProps={{
          transition: {
            onExited: () => {
              setDeletedName("");
              if (focusAfterClose.current) {
                focusAfterClose.current = false;
                (searchRef.current ?? titleRef.current)?.focus();
              }
            },
          },
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Eliminar cumpleaños</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Seguro que quieres eliminar a <strong>{deletedName}</strong>? Esta
            acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="inherit"
            onClick={() => setToDelete(null)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={
              deleting ? <CircularProgress size={18} color="inherit" /> : null
            }
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* FEEDBACK */}
      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={5000}
        onClose={(_, reason) => {
          if (reason !== "clickaway") setFeedback(null);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {feedback ? (
          <Alert
            severity={feedback.severity}
            variant="filled"
            onClose={() => setFeedback(null)}
            sx={{ width: "100%" }}
          >
            {feedback.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
