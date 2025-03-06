
import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader } from "lucide-react"

const Loader2 = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div className={cn("flex items-center justify-center", className)} ref={ref} {...props}>
      <Loader className="h-4 w-4 animate-spin" />
    </div>
  )
})

Loader2.displayName = "Loader2"

export default Loader2
