import { indexLoader } from "../lib/guard";
import SessionLoading from "./auth/SessionLoading";

export const clientLoader = indexLoader;
export const HydrateFallback = SessionLoading;

export default function Redirect() {
  return null;
}
