import * as React from "react"
import { cn } from "@/lib/utils"

const Separator = React.forwardRef<HTMLHRElement, React.HTMLAttributes<HTMLHRElement> & { orientation?: "horizontal" | "vertical" }>(({ className, orientation = "horizontal", ...props }, ref) => (
  <hr
    ref={ref}
    className={cn("shrink-0 border-white/[0.075] bg-white/[0.075]", orientation === "horizontal" ? "h-px w-full" : "min-h-full w-px", className)}
    {...props}
  />
))
Separator.displayName = "Separator"

export { Separator }
