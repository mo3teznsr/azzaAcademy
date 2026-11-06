"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

/**
 * shadcn input-group, styled to BRAND.md: one 14px box holds the icon, the field and its
 * actions; :focus-within draws the greenDeep border and the 3px halo.
 */
function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group relative flex w-full min-w-0 items-center rounded-[14px] border border-input bg-card transition-[color,box-shadow,border-color] outline-none",
        "h-12 has-[>textarea]:h-auto",
        // Addon alignment tweaks the field padding.
        "has-[>[data-align=inline-start]]:[&>input]:ps-1.5",
        "has-[>[data-align=inline-end]]:[&>input]:pe-1.5",
        "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",
        // Focus: greenDeep border + halo.
        "has-[[data-slot=input-group-control]:focus-visible]:border-field-focus has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-field-halo",
        // Error.
        "has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40",
        // Disabled.
        "has-[[data-slot=input-group-control]:disabled]:bg-input/50 has-[[data-slot=input-group-control]:disabled]:opacity-60",
        className
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      align: {
        "inline-start": "order-first ps-3.5 has-[>button]:-ms-1.5",
        "inline-end": "order-last pe-3.5 has-[>button]:-me-1.5",
        "block-start": "order-first w-full justify-start px-3.5 pt-3 [.border-b]:pb-3",
        "block-end": "order-last w-full justify-start px-3.5 pb-3 [.border-t]:pt-3",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
)

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return
        e.currentTarget.parentElement?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea")?.focus()
      }}
      {...props}
    />
  )
}

const inputGroupButtonVariants = cva("flex items-center gap-2 text-sm shadow-none hover:translate-y-0", {
  variants: {
    size: {
      xs: "h-7 min-h-7 gap-1 px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5",
      sm: "h-8 min-h-8 gap-1.5 px-2.5 has-[>svg]:px-2.5",
      "icon-xs": "size-7 min-h-7 p-0 has-[>svg]:p-0",
      "icon-sm": "size-8 min-h-8 p-0 has-[>svg]:p-0",
    },
  },
  defaultVariants: {
    size: "xs",
  },
})

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> & VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), "text-muted-foreground hover:text-foreground", className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "h-full flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "min-h-28 flex-1 resize-none rounded-none border-0 bg-transparent px-3.5 py-3 text-[15px] shadow-none focus-visible:ring-0 aria-invalid:ring-0 md:text-[15px] dark:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupInput, InputGroupTextarea }
