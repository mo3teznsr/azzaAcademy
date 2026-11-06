import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "press group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent bg-clip-padding font-bold whitespace-nowrap outline-none select-none hover:-translate-y-px focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /* Main action: ink fill + white on light (hover green-deep); green fill + ink-deep on dark (hover mint). */
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        onair: "bg-onair text-onair-ink hover:bg-onair/90",
        /* Accent: the bright green never takes white text, so ink-deep on green; hover mint. */
        sun: "bg-green text-ink-deep hover:bg-mint",
        outline: "border-input bg-transparent text-foreground hover:border-green-deep hover:bg-accent aria-expanded:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-accent aria-expanded:bg-accent",
        destructive: "border-danger-line bg-danger-bg text-danger-fg hover:border-danger-fg/40 hover:bg-danger-bg/70",
        /* Fixed dark green fill with white text in both themes; hover green-deep. */
        ink: "bg-ink text-white hover:bg-green-deep",
        link: "rounded-none px-0 text-link underline-offset-4 decoration-green hover:-translate-y-0 hover:text-(--link-hover) hover:underline",
      },
      size: {
        default: "min-h-11 px-5 text-[15px]",
        sm: "min-h-9 px-3.5 text-sm",
        lg: "min-h-13 px-7 text-base",
        xs: "min-h-7 px-2.5 text-xs",
        icon: "size-11",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
        "icon-xs": "size-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
