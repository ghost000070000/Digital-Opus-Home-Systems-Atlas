import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-20 w-full rounded-md bg-surface px-3 py-2 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-faint",
        "transition-[box-shadow] duration-150 focus-visible:shadow-[0_0_0_1px_var(--color-copper)] focus-visible:outline-none",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
