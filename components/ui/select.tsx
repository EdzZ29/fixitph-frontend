import * as React from "react"
import { cn } from "cn"
import { ChevronDown } from "lucide-react"

/**
 * A native <select>, not a Radix listbox.
 *
 * The dashboards use selects for short, well-known option sets: a booking
 * status, a pricing type, a category. On the mid-range Android phones most of
 * this traffic comes from, the platform picker is faster, works with the
 * on-screen keyboard, and needs no JavaScript to open. A custom listbox would
 * look tidier in a screenshot and be worse to use.
 */
function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "h-8 w-full appearance-none rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:[&>option]:bg-background",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2"
        aria-hidden
      />
    </div>
  )
}

export { Select }
