export const APP_VERSION: string;
export const BUILD_ID: string;
export const BUILD_DATE: string;
export const BUILD_TIME: string;
export const APP_IDENTITY: string;
export function buildIdentity(version: string, buildTime: string, buildId: string): string;
export function formatVersion(version?: string, buildDate?: string, buildId?: string): string;
