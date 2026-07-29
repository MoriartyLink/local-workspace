import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[11px] text-sm font-semibold tracking-[-0.01em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8CEE2]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#161823] disabled:pointer-events-none disabled:opacity-45 cursor-pointer active:scale-[0.98] backdrop-blur-xl",
  {
    variants: {
      variant: {
        default: "border border-[#B8CEE2]/30 bg-[#53589A]/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_7px_22px_rgba(22,24,35,0.38)] hover:bg-[#6268AD]",
        destructive: "border border-red-400/30 bg-red-500/90 text-white shadow-[0_5px_16px_rgba(239,68,68,0.18)] hover:bg-red-500",
        outline: "border border-[#B8CEE2]/15 bg-[#B8CEE2]/[0.055] text-[#C9D8E7] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] hover:border-[#B8CEE2]/28 hover:bg-[#B8CEE2]/10 hover:text-white",
        secondary: "border border-[#B8CEE2]/16 bg-[#35385F]/78 text-[#DCE7F1] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-[#454978]",
        ghost: "text-[#A8B7CA] hover:bg-[#B8CEE2]/[0.08] hover:text-white",
        link: "text-[#B8CEE2] underline-offset-4 hover:text-white hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-[9px] px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = "Button"
export { Button, buttonVariants }
