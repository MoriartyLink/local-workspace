import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  indicatorClassName?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({ className, value = 0, indicatorClassName, ...props }, ref) => (
  <div
    ref={ref}
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={value}
    className={cn("relative h-2 w-full overflow-hidden rounded-full bg-white/[0.08]", className)}
    {...props}
  >
    <div
      className={cn("h-full rounded-full bg-[linear-gradient(90deg,#53589A,#B8CEE2)] shadow-[0_0_12px_rgba(83,88,154,0.48)] transition-all", indicatorClassName)}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
))
Progress.displayName = "Progress"

export { Progress }
