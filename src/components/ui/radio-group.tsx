import * as React from "react"
import { cn } from "@/lib/utils"

type RadioGroupContextType = {
  value?: string;
  onValueChange?: (value: string) => void;
};

const RadioGroupContext = React.createContext<RadioGroupContextType>({});

type RadioGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: string;
  onValueChange?: (value: string) => void;
};

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(({ className, value, onValueChange, ...props }, ref) => (
  <RadioGroupContext.Provider value={{ value, onValueChange }}>
    <div ref={ref} role="radiogroup" className={cn("grid gap-2", className)} {...props} />
  </RadioGroupContext.Provider>
))
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }>(({ className, value, ...props }, ref) => {
  const { value: groupValue, onValueChange } = React.useContext(RadioGroupContext);
  const isChecked = groupValue === value;

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={isChecked}
      value={value}
      onClick={() => onValueChange?.(value)}
      className={cn(
        "h-4 w-4 rounded-full border border-[#B8CEE2]/25 bg-[#11121C]/75 text-[#B8CEE2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8CEE2]/50 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition-all",
        isChecked && "border-[#B8CEE2] bg-[#53589A]",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-center">
        <div className={cn("h-2 w-2 rounded-full bg-white transition-opacity", isChecked ? "opacity-100" : "opacity-0")} />
      </div>
    </button>
  );
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
