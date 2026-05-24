import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// iOS-flavored button system: pill radius, soft shadow, subtle press-scale,
// SF-style medium weight, smooth opacity transitions on hover/active.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-xs font-semibold tracking-tight whitespace-nowrap outline-none select-none transition-[transform,opacity,background-color,box-shadow,color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.96] active:opacity-90 disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.25),0_0_0_0.5px_rgba(255,255,255,0.08)_inset] hover:bg-primary/90 [a]:hover:bg-primary/90",
        outline:
          "border-border/60 bg-white/[0.04] backdrop-blur-sm text-foreground hover:bg-white/[0.08] hover:border-border aria-expanded:bg-white/[0.08]",
        secondary:
          "bg-white/[0.06] text-secondary-foreground hover:bg-white/[0.10] aria-expanded:bg-white/[0.10]",
        ghost:
          "hover:bg-white/[0.06] hover:text-foreground aria-expanded:bg-white/[0.08]",
        destructive:
          "bg-destructive text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)] hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline rounded-none",
      },
      size: {
        default: "h-9 gap-1.5 px-4",
        xs: "h-6 gap-1 px-2.5 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-5 text-sm",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-10",
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
