import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "press group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent bg-clip-padding font-semibold whitespace-nowrap outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        onair: "bg-onair text-ink hover:bg-[#ff7354]",
        sun: "bg-sun text-ink hover:bg-[#ffdc6e]",
        outline: "border-input bg-transparent text-foreground hover:bg-accent aria-expanded:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-accent aria-expanded:bg-accent",
        destructive: "border-danger-line bg-danger-bg text-danger-fg hover:bg-[#3a1a14] light:hover:bg-[#f7d3c8]",
        ink: "bg-ink text-ivory hover:bg-ink-2",
        link: "rounded-none px-0 text-sun-fg underline-offset-4 hover:underline in-data-[theme=cream]:text-ink",
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
