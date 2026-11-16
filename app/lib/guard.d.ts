type LoaderArgs = { request: Request };
export function loginUrl(path: string): string;
export function guardLoader(args: LoaderArgs): Response | null;
export namespace guardLoader { let hydrate: true; }
export function indexLoader(): Response;
export namespace indexLoader { let hydrate: true; }
export function changePasswordLoader(args: LoaderArgs): Response | null;
export namespace changePasswordLoader { let hydrate: true; }
