import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-[#FFFFFF] shadow-lg shadow-primary/20 hover:bg-primary-dim hover:scale-[1.02]",
        secondary:
          "bg-secondary text-[#FFFFFF] hover:opacity-90",
        soft: "bg-white text-primary shadow-sm ring-1 ring-primary/20 hover:bg-primary-container",
        ghost: "bg-transparent text-text-soft hover:bg-surface-container-low",
        danger:
          "bg-red-50 text-red-600 hover:bg-red-100",
      },
      size: {
        default: "h-12 px-6 text-[0.98rem]",
        sm: "h-10 px-4 text-sm",
        lg: "h-14 px-7 text-lg",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
