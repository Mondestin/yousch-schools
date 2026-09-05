import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-[8px] border bg-transparent px-3 py-1 text-[13px] shadow-none transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[13px] file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring",
        "aria-invalid:ring-1 aria-invalid:ring-primary/20 aria-invalid:border-primary",
        className
      )}
      {...props}
    />
  )
}

export { Input }
