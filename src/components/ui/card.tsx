import * as React from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[2rem] bg-white p-6 shadow-[0_20px_60px_rgba(30,57,75,0.08)] sm:p-8",
        className,
      )}
      {...props}
    />
  );
}
