import {
  Alert,
  Box,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { MONTH_NAMES } from "../../lib/birthday";
import { buildPreview, isLeapDayWithAge } from "../../lib/birthdayForm";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const MODE_HELP = {
  none: "No hace falta. Solo recordaremos el día y el mes.",
  age: "Escribe la edad que tiene hoy; calcularemos el año de nacimiento.",
};

/**
 * Campos de cumpleaños (día, mes y año opcional) compartidos por registro y edición.
 * Se alimenta de Formik: values, errors, touched, setFieldValue, setFieldTouched.
 * `hadSavedYear` (edición): avisa si se descarta un año guardado.
 */
export default function BirthdayFields({
  values,
  errors,
  touched,
  setFieldValue,
  setFieldTouched,
  readOnly = false,
  hadSavedYear = false,
  dense = false,
}) {
  const shown = (field) => (touched[field] && errors[field]) || "";
  const mode = values.year_mode;
  const activeField = mode === "year" ? "birth_year" : mode === "age" ? "age" : null;
  const firstError =
    shown("birth_day") || shown("birth_month") || (activeField ? shown(activeField) : "");
  const preview = firstError ? null : buildPreview(values);

  const setPart = (field) => (e) => {
    setFieldValue(field, e.target.value);
    setFieldTouched(field, true, false);
  };

  const changeMode = (_, next) => {
    if (!next || next === mode || readOnly) return;
    // conserva lo escrito en cada modo, pero sin errores visibles del modo anterior
    setFieldTouched("birth_year", false, false);
    setFieldTouched("age", false, false);
    setFieldValue("year_mode", next);
  };

  const selectProps = {
    select: true,
    required: true,
    fullWidth: true,
    slotProps: {
      select: { native: true },
      inputLabel: { shrink: true },
    },
    // un <select> nativo ignora readOnly: se deshabilita mientras se guarda
    disabled: readOnly,
    sx: { minWidth: 0 },
  };

  const yearField = (
    <TextField
      key={mode}
      label={mode === "year" ? "Año" : "Edad"}
      name={mode === "year" ? "birth_year" : "age"}
      type="number"
      required
      fullWidth
      value={mode === "year" ? values.birth_year : values.age}
      onChange={(e) => setFieldValue(activeField, e.target.value)}
      onBlur={() => setFieldTouched(activeField, true)}
      error={Boolean(shown(activeField))}
      slotProps={{
        htmlInput: { inputMode: "numeric", "aria-describedby": "birthday-preview" },
        input: { readOnly },
      }}
    />
  );

  const leapAlert = isLeapDayWithAge(values) ? (
    <Alert severity="warning">
      Con el 29 de febrero, calcular desde la edad puede dar un año que no es
      bisiesto. Si no se puede guardar, cambia a «Año de nacimiento».
    </Alert>
  ) : null;

  const previewBox = (
    <Box
      id="birthday-preview"
      aria-live="polite"
      sx={{ minHeight: dense ? 40 : 44, ...(dense && activeField ? { pt: 0.5 } : {}) }}
    >
      {firstError ? (
        <Typography color="error" variant="body2">
          {firstError}
        </Typography>
      ) : preview ? (
        <>
          <Typography variant="body2" fontWeight={600}>
            {preview.main}
          </Typography>
          {preview.extra && (
            <Typography variant="body2" color="text.secondary">
              {preview.extra}
            </Typography>
          )}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Elige el día y el mes del cumpleaños.
        </Typography>
      )}
    </Box>
  );

  return (
    <Stack spacing={dense ? 1.5 : 2}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(88px, 1fr) 2fr",
          gap: dense ? 1.5 : 2,
          alignItems: "start",
        }}
      >
        <TextField
          {...selectProps}
          label="Día"
          name="birth_day"
          value={values.birth_day}
          onChange={setPart("birth_day")}
          onBlur={() => setFieldTouched("birth_day", true)}
          error={Boolean(shown("birth_day"))}
        >
          <option value="" />
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </TextField>
        <TextField
          {...selectProps}
          label="Mes"
          name="birth_month"
          value={values.birth_month}
          onChange={setPart("birth_month")}
          onBlur={() => setFieldTouched("birth_month", true)}
          error={Boolean(shown("birth_month"))}
        >
          <option value="" />
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>
              {cap(m)}
            </option>
          ))}
        </TextField>
      </Box>

      <Box>
        <Typography id="birth-year-legend" variant="subtitle2" gutterBottom>
          ¿Sabes el año de nacimiento?
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          color="primary"
          value={mode}
          onChange={changeMode}
          aria-labelledby="birth-year-legend"
          sx={{ flexWrap: { xs: "wrap", sm: "nowrap" } }}
        >
          <ToggleButton value="none">No sé</ToggleButton>
          <ToggleButton value="year">Año de nacimiento</ToggleButton>
          <ToggleButton value="age">Edad actual</ToggleButton>
        </ToggleButtonGroup>
        {MODE_HELP[mode] && (
          <Typography variant="body2" color="text.secondary" mt={dense ? 0.5 : 1}>
            {MODE_HELP[mode]}
          </Typography>
        )}
      </Box>

      {mode === "none" && hadSavedYear && (
        <Alert severity="warning">Se quitará el año guardado</Alert>
      )}

      {dense && activeField ? (
        // compacto: campo Año/Edad junto a la vista previa (misma fila desde sm)
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "minmax(120px, 1fr) 2fr" },
            gap: 1.5,
            alignItems: "start",
          }}
        >
          {yearField}
          {previewBox}
        </Box>
      ) : (
        <>
          {activeField && yearField}
          {leapAlert}
          {previewBox}
        </>
      )}

      {dense && activeField && leapAlert}
    </Stack>
  );
}
