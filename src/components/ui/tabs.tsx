import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
} | null>(null)

function useTabsContext() {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error("Tabs components must be used within Tabs")
  return ctx
}

const Tabs = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}>(({ className, value, defaultValue, onValueChange, children, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || value || "")
  React.useEffect(() => {
    if (value !== undefined) setInternalValue(value)
  }, [value])
  const handleChange = (newValue: string) => {
    setInternalValue(newValue)
    onValueChange?.(newValue)
  }
  return (
    <TabsContext.Provider value={{ value: internalValue, onValueChange: handleChange }}>
      <div ref={ref} className={cn("", className)} {...props} data-state={internalValue}>
        {children}
      </div>
    </TabsContext.Provider>
  )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} role="tablist" className={cn("inline-flex h-9 items-center justify-center rounded-[11px] border border-[#B8CEE2]/10 bg-[#11121C]/55 p-1 text-[#98A8BC] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-2xl", className)} {...props} />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }>(({ className, value, ...props }, ref) => {
  const { value: selectedValue, onValueChange } = useTabsContext()
  const isActive = selectedValue === value
  return (
    <button
      ref={ref}
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-[8px] px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8CEE2]/50 disabled:pointer-events-none disabled:opacity-50",
        isActive ? "bg-[#53589A]/85 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_5px_16px_rgba(5,5,14,0.22)]" : "text-[#98A8BC] hover:text-white",
        className
      )}
      {...props}
    />
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(({ className, value, ...props }, ref) => {
  const { value: selectedValue } = useTabsContext()
  const isActive = selectedValue === value
  return (
    <div
      ref={ref}
      role="tabpanel"
      data-state={isActive ? "active" : "inactive"}
      className={cn("mt-2", !isActive && "hidden", className)}
      {...props}
    />
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
