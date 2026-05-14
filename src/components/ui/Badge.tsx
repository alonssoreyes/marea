import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-brand-100 bg-brand-50 text-brand-700",
        outline: "border-line text-ink-soft",
        soft: "border-transparent bg-brand-100 text-brand-800",
        danger: "border-red-100 bg-red-50 text-red-700",
        warning: "border-orange-100 bg-orange-50 text-orange-700",
        ink: "border-transparent bg-brand-900 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
