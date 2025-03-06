import * as React from "react"

import { cn } from "@/lib/utils"

interface LoaderProps extends React.SVGProps<SVGSVGElement> {
  className?: string
}

const Loader2 = React.forwardRef<SVGSVGElement, LoaderProps>(
  ({ className, ...props }, ref) => (
    <svg
      ref={ref}
      className={cn("h-4 w-4 animate-spin", className)}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
)

Loader2.displayName = "Loader2"

export { Loader2 }