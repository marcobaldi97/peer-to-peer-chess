import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from 'lib/utils'

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-9 w-full rounded border border-divider bg-transparent px-3 text-sm text-text',
      'placeholder:text-text/50 focus-visible:border-accent focus-visible:outline-none',
      className
    )}
    {...props}
  />
))

Input.displayName = 'Input'
