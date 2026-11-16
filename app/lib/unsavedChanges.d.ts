export function hasUnsavedChanges(): boolean;
export function subscribeUnsavedChanges(listener: () => void): () => void;
export function beginWork(): () => void;
export function useUnsavedChanges(dirty: boolean): void;
export function resetUnsavedChanges(): void;
