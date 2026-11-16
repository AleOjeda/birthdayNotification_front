export const EXPIRED_MESSAGE: string;
export function useSessionExpiry(expiresAt: number | undefined): void;
export function useSessionEvents(): {
  notice: string | null;
  message: string;
  open: boolean;
  closeNotice: () => void;
};
export function useSessionBar(): { userName: string; loggingOut: boolean; logout: () => Promise<void> };
