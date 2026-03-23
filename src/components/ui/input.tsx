import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-2xl border border-surface-container-high bg-white px-4 text-[0.98rem] text-text-strong outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
