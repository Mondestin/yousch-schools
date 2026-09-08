import type { LucideIcon } from 'lucide-react';
import { Camera } from 'lucide-react';
import { Field } from '@/components/sms/field';
import { cn } from '@/lib/utils';

export function PhotoField({
    id = 'photo',
    name,
    label = 'Photo',
    preview,
    fallback: Icon,
    alt = '',
    hint,
    size = 'sm',
    previewClassName,
    imageClassName,
    onFile,
}: {
    id?: string;
    name?: string;
    label?: string;
    preview: string | null;
    fallback?: LucideIcon;
    alt?: string;
    hint?: string;
    size?: 'sm' | 'lg';
    previewClassName?: string;
    imageClassName?: string;
    onFile: (file: File | null) => void;
}) {
    const large = size === 'lg';

    return (
        <Field
            id={id}
            label={label}
            hint={hint ?? 'Cliquez pour choisir une image.'}
        >
            <label
                htmlFor={id}
                className={cn(
                    'group border-input hover:border-primary/40 relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[8px] border border-dashed transition-colors',
                    large ? 'aspect-square w-full max-w-[16rem]' : 'size-24',
                    previewClassName,
                )}
            >
                {preview ? (
                    <img
                        src={preview}
                        alt={alt}
                        className={cn(
                            'size-full',
                            imageClassName ?? 'object-cover',
                        )}
                    />
                ) : Icon ? (
                    <Icon className="text-muted-foreground size-8" />
                ) : (
                    <Camera className="text-muted-foreground size-8" />
                )}
                <span className="bg-background/80 text-foreground absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 py-1 text-[11px] font-medium opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                    <Camera className="size-3" />
                    {preview ? 'Changer' : 'Choisir'}
                </span>
                <input
                    id={id}
                    name={name}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) =>
                        onFile(event.target.files?.[0] ?? null)
                    }
                />
            </label>
        </Field>
    );
}
