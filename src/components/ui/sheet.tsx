import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { side?: "right" | "left" | "bottom" }) {
  const pos =
    side === "bottom"
      ? "inset-x-0 bottom-0 max-h-[85vh] rounded-t-xl"
      : side === "left"
        ? "inset-y-0 left-0 h-full w-[min(380px,100vw)] rounded-r-lg"
        : "inset-y-0 right-0 h-full w-[min(380px,100vw)] rounded-l-lg";
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-bg/60" />
      <DialogPrimitive.Content
        className={cn("fixed z-50 bg-bg-elevated p-4 text-fg shadow-[var(--shadow-border)]", pos, className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-2 top-2 size-10 rounded-sm text-muted hover:text-fg">
          <X className="mx-auto size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-display text-xl text-fg", className)}
      {...props}
    />
  );
}
