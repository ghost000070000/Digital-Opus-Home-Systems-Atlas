import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export function AlertDialogContent({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-bg/70" />
      <AlertDialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-bg-elevated p-5 text-fg shadow-[var(--shadow-border)]",
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogTitle({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn("font-display text-2xl text-fg", className)}
      {...props}
    />
  );
}

export function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description className={cn("mt-2 text-sm text-muted", className)} {...props} />
  );
}

export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-5 flex justify-end gap-2", className)} {...props} />;
}

export function AlertDialogCancel({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: "ghost" }), className)} {...props} />
  );
}

export function AlertDialogAction({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action className={cn(buttonVariants({ variant: "danger" }), className)} {...props} />
  );
}
