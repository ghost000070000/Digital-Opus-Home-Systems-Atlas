import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-sm bg-surface px-3 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-faint",
        "transition-[box-shadow] duration-150 focus-visible:shadow-[0_0_0_1px_var(--color-copper)] focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";
