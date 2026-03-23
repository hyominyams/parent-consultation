import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-[0.02em]",
  {
    variants: {
      variant: {
        primary: "bg-primary-container text-on-primary-container",
        muted: "bg-surface-container-low text-text-muted",
        blocked: "bg-surface-container text-text-muted",
        booked: "bg-primary-container text-primary",
        danger: "bg-red-50 text-red-600",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
