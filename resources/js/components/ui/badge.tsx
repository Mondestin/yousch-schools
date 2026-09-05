import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        success:
          "border-success/20 bg-success-soft text-success",
        warning:
          "border-warning/20 bg-warning-soft text-warning",
        danger:
          "border-danger/20 bg-danger-soft text-danger",
        muted:
          "border-border/80 bg-muted text-muted-foreground",
        purple:
          "border-event-purple-line bg-event-purple-soft text-event-purple",
        blue:
          "border-event-blue-line bg-event-blue-soft text-event-blue",
        teal:
          "border-event-teal-line bg-event-teal-soft text-event-teal",
        green:
          "border-event-green-line bg-event-green-soft text-event-green",
        amber:
          "border-event-amber-line bg-event-amber-soft text-event-amber",
        rose:
          "border-event-rose-line bg-event-rose-soft text-event-rose",
        code:
          "rounded-md border-transparent bg-primary/10 font-medium text-primary",
        destructive:
          "border-danger/20 bg-danger-soft text-danger",
        outline:
          "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
