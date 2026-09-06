import { toast } from 'sonner';

/** Green: a record was created or updated (persisted). */
export function toastSaved(message = 'Enregistré'): void {
    toast.success(message);
}

/** Amber: a record was removed (persisted). */
export function toastRemoved(message = 'Supprimé'): void {
    toast.warning(message);
}

/** Blue: action not yet wired to the API. */
export function toastStub(message = 'Action de maquette'): void {
    toast.info(message, {
        description:
            'Maquette — les modifications ne sont pas encore enregistrées.',
    });
}

/** Red: API or validation failure. */
export function toastApiError(
    error: unknown,
    fallback = 'Échec de l’enregistrement',
): void {
    const message =
        error instanceof Error && error.message.trim() !== ''
            ? error.message
            : fallback;

    toast.error(message);
}
