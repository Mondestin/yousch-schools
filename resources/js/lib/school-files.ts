import { toast } from 'sonner';
import type { DossierFile } from '@/types/school';

export const DOSSIER_ACCEPT =
    'image/*,.pdf,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const DOSSIER_MAX_BYTES = 5 * 1024 * 1024;

export function dossierFilesOf(
    item:
        | {
              files?: DossierFile[];
          }
        | null
        | undefined,
): DossierFile[] {
    return item?.files ?? [];
}

export function isImageDossier(file: DossierFile): boolean {
    if (file.mime.startsWith('image/')) {
        return true;
    }

    return (
        file.url.startsWith('data:image/') ||
        /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(file.name)
    );
}

export function readDossierFile(file: File): Promise<DossierFile> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            if (typeof reader.result !== 'string') {
                reject(new Error('Lecture impossible.'));

                return;
            }

            resolve({
                id: `df-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                name: file.name,
                url: reader.result,
                mime: file.type || 'application/octet-stream',
            });
        };
        reader.onerror = () =>
            reject(reader.error ?? new Error('Lecture impossible.'));
        reader.readAsDataURL(file);
    });
}

export async function appendDossierFiles(
    current: DossierFile[],
    incoming: FileList | File[] | null,
): Promise<DossierFile[]> {
    const list = incoming === null ? [] : Array.from(incoming);

    if (list.length === 0) {
        return current;
    }

    const next = [...current];

    for (const file of list) {
        if (file.size > DOSSIER_MAX_BYTES) {
            toast.error(`${file.name} dépasse 5 Mo.`);

            continue;
        }

        try {
            next.push(await readDossierFile(file));
        } catch {
            toast.error(`Impossible de lire ${file.name}.`);
        }
    }

    return next;
}
