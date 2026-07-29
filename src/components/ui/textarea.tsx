import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-[#B8CEE2]/[0.13] bg-[#11121C]/55 px-3.5 py-3 text-sm leading-relaxed text-[#EAF2FA] shadow-[inset_0_1px_0_rgba(255,255,255,0.055),inset_0_1px_3px_rgba(0,0,0,0.22)] backdrop-blur-xl placeholder:text-[#707E93] transition-all focus-visible:border-[#B8CEE2]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53589A]/35 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
