import type { SxProps, Theme } from "@mui/material/styles";
export interface AppVersionProps {
  version?: string;
  buildDate?: string;
  buildId?: string;
  sx?: SxProps<Theme>;
}
export default function AppVersion(props: AppVersionProps): JSX.Element;
