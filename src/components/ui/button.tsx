import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap',
    'rounded font-heading font-semibold transition-colors',
    'disabled:pointer-events-none disabled:opacity-45'
  ],
  {
    variants: {
      variant: {
        primary:
          'border border-accent text-accent hover:bg-accent/10 active:bg-accent/20',
        secondary:
          'border border-divider text-text hover:bg-text/5 active:bg-text/10',
        ghost: 'text-accent hover:bg-accent/10 active:bg-accent/20'
      },
      size: {
        default: 'h-9 px-4 text-sm',
        lg: 'h-12 px-4 text-base',
        block: 'h-12 w-full px-4 text-base',
        icon: 'size-9',
        'icon-lg': 'size-12'
      }
    },
    defaultVariants: { variant: 'secondary', size: 'default' }
  }
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
)

Button.displayName = 'Button'
