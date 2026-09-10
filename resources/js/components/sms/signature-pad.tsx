import { Eraser } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Point = { x: number; y: number };

export function SignaturePad({
    onChange,
    className,
    height = 140,
}: {
    onChange: (dataUrl: string | null) => void;
    className?: string;
    height?: number;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawing = useRef(false);
    const last = useRef<Point | null>(null);
    const stroked = useRef(false);
    const [hasStroke, setHasStroke] = useState(false);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const paintBlank = useCallback(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const ratio = window.devicePixelRatio || 1;
        const width = canvas.clientWidth;

        canvas.width = Math.max(1, Math.floor(width * ratio));
        canvas.height = Math.max(1, Math.floor(height * ratio));

        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return;
        }

        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    }, [height]);

    useEffect(() => {
        paintBlank();
        stroked.current = false;
        setHasStroke(false);
        onChangeRef.current(null);

        const onWindowResize = () => {
            paintBlank();
            stroked.current = false;
            setHasStroke(false);
            onChangeRef.current(null);
        };

        window.addEventListener('resize', onWindowResize);

        return () => window.removeEventListener('resize', onWindowResize);
    }, [paintBlank]);

    function pointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>): Point {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    function notify(): void {
        const canvas = canvasRef.current;

        if (!canvas || !stroked.current) {
            onChangeRef.current(null);

            return;
        }

        onChangeRef.current(canvas.toDataURL('image/png'));
    }

    function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>): void {
        event.preventDefault();
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        canvas.setPointerCapture(event.pointerId);
        drawing.current = true;
        last.current = pointFromEvent(event);
    }

    function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>): void {
        if (!drawing.current || !last.current) {
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (!canvas || !ctx) {
            return;
        }

        const next = pointFromEvent(event);
        ctx.beginPath();
        ctx.moveTo(last.current.x, last.current.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
        last.current = next;
        stroked.current = true;
        setHasStroke(true);
    }

    function endStroke(event: ReactPointerEvent<HTMLCanvasElement>): void {
        if (!drawing.current) {
            return;
        }

        drawing.current = false;
        last.current = null;

        try {
            event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
            // already released
        }

        notify();
    }

    function clear(): void {
        paintBlank();
        stroked.current = false;
        setHasStroke(false);
        onChangeRef.current(null);
    }

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <canvas
                ref={canvasRef}
                className="border-border touch-none w-full cursor-crosshair rounded-[8px] border bg-white"
                style={{ height }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endStroke}
                onPointerCancel={endStroke}
                onPointerLeave={(event) => {
                    if (drawing.current) {
                        endStroke(event);
                    }
                }}
            />
            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clear}
                    disabled={!hasStroke}
                >
                    <Eraser className="size-3.5" />
                    Effacer
                </Button>
            </div>
        </div>
    );
}
