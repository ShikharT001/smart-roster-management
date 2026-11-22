import React from "react";
import clsx from "clsx";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "neutral";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}) => {
  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium border select-none",
        {
          "text-[10px] px-1.5 py-0.5 rounded": size === "sm",
          "text-xs px-2 py-0.5 rounded-md": size === "md",

          "bg-surface text-foreground border-border": variant === "default",
          "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800":
            variant === "success",
          "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800":
            variant === "warning",
          "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800":
            variant === "error",
          "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800":
            variant === "info",
          "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700":
            variant === "neutral",
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
