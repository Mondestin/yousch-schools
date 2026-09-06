import { FileText, Paperclip, Trash2 } from 'lucide-react';
import { Field } from '@/components/sms/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    appendDossierFiles,
    DOSSIER_ACCEPT,
    isImageDossier,
} from '@/lib/school-files';
import type { DossierFile } from '@/types/school';

export function FileListField({
    id = 'files',
    label = 'Fichiers',
    hint = 'PDF, Word ou image, 5 Mo maximum par fichier.',
    files,
    onChange,
    onNativeFiles,
}: {
    id?: string;
    label?: string;
    hint?: string;
    files: DossierFile[];
    onChange?: (files: DossierFile[]) => void;
    onNativeFiles?: (files: File[]) => void;
}) {
    const editable = onChange !== undefined;

    return (
        <Field id={id} label={label} hint={editable ? undefined : hint}>
            {files.length === 0 ? (
                <p className="text-muted-foreground text-[13px]">
                    Aucun fichier.
                </p>
            ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                    {files.map((file) => (
                        <li
                            key={file.id}
                            className="flex items-center gap-2 rounded-[8px] border px-3 py-2"
                        >
                            {isImageDossier(file) &&
                            file.url !== '#' &&
                            !file.url.startsWith('#') ? (
                                <img
                                    src={file.url}
                                    alt=""
                                    className="size-8 shrink-0 rounded-[6px] border object-cover"
                                />
                            ) : (
                                <FileText className="text-muted-foreground size-4 shrink-0" />
                            )}
                            {file.url === '#' ? (
                                <span className="min-w-0 flex-1 truncate text-[13px]">
                                    {file.name}
                                </span>
                            ) : (
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary min-w-0 flex-1 truncate text-[13px] hover:underline"
                                >
                                    {file.name}
                                </a>
                            )}
                            {editable ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-danger shrink-0 px-2"
                                    onClick={() =>
                                        onChange?.(
                                            files.filter(
                                                (item) => item.id !== file.id,
                                            ),
                                        )
                                    }
                                >
                                    <Trash2 />
                                    <span className="sr-only">Retirer</span>
                                </Button>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
            {editable ? (
                <label className="border-input hover:border-primary/40 hover:bg-muted/30 mt-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[8px] border border-dashed px-4 py-5 text-center transition-colors">
                    <Input
                        id={id}
                        type="file"
                        multiple
                        accept={DOSSIER_ACCEPT}
                        className="hidden"
                        onChange={(event) => {
                            const selected = event.target.files;

                            if (selected && selected.length > 0) {
                                onNativeFiles?.(Array.from(selected));
                            }

                            void appendDossierFiles(files, selected).then(
                                (next) => {
                                    onChange?.(next);
                                },
                            );
                            event.target.value = '';
                        }}
                    />
                    <Paperclip className="text-muted-foreground size-4" />
                    <span className="text-[13px] font-medium">
                        Déposer ou choisir un fichier
                    </span>
                    <span className="text-muted-foreground text-[12px]">
                        PDF, Word ou image · 5 Mo maximum
                    </span>
                </label>
            ) : null}
        </Field>
    );
}
