import { Typography } from "@mui/material";
import { APP_VERSION, BUILD_DATE, BUILD_ID, formatVersion } from "../../lib/version";

/** Versión discreta de la aplicación (no focalizable, una línea). */
export default function AppVersion({
  version = APP_VERSION,
  buildDate = BUILD_DATE,
  buildId = BUILD_ID,
  sx,
}) {
  return (
    <Typography
      variant="caption"
      component="div"
      role="note"
      aria-label="Versión de la aplicación"
      data-testid="app-version"
      noWrap
      sx={{ color: "text.secondary", textAlign: "left", userSelect: "text", ...sx }}
    >
      {formatVersion(version, buildDate, buildId)}
    </Typography>
  );
}
