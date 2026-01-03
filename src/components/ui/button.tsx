"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md active:scale-[0.98]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 shadow-sm hover:shadow-md active:scale-[0.98]",
        outline:
          "border-2 bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/50 dark:bg-input/30 dark:border-input dark:hover:bg-input/50 active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md active:scale-[0.98]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline active:scale-[0.98]",
      },
      size: {
        default: "h-11 px-5 py-2 has-[>svg]:px-4 min-h-[44px] touch-manipulation", /* 44px minimum for mobile */
        sm: "h-10 rounded-md gap-1.5 px-3.5 text-xs has-[>svg]:px-2.5 min-h-[44px] touch-manipulation", /* 44px minimum for mobile */
        lg: "h-14 rounded-lg px-8 text-base has-[>svg]:px-6 min-h-[44px] touch-manipulation", /* 44px minimum for mobile */
        icon: "size-11 min-w-[44px] min-h-[44px] touch-manipulation", /* 44px minimum for mobile */
        "icon-sm": "size-10 min-w-[44px] min-h-[44px] touch-manipulation", /* 44px minimum for mobile */
        "icon-lg": "size-14 min-w-[44px] min-h-[44px] touch-manipulation", /* 44px minimum for mobile */
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

import { motion } from "framer-motion"

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
  const Comp = asChild ? Slot : motion.button

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...(asChild ? {} : { whileTap: { scale: 0.98 } })}
      {...(props as any)}
    />
  )
}

export { Button, buttonVariants }
