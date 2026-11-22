import React from "react";
import clsx from "clsx";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={clsx(
          "inline-flex items-center justify-center font-medium transition-colors border select-none focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed",
          {
            // Sizes
            "text-xs px-2.5 py-1 rounded gap-1.5": size === "sm",
            "text-sm px-3.5 py-1.5 rounded-md gap-2": size === "md",
            "text-base px-4 py-2 rounded-md gap-2.5": size === "lg",

            // Variants
            "bg-accent border-transparent text-accent-foreground hover:opacity-90":
              variant === "primary",
            "bg-surface border-border text-foreground hover:bg-surface-hover":
              variant === "secondary",
            "bg-red-600 border-transparent text-white hover:bg-red-700":
              variant === "danger",
            "bg-transparent border-transparent text-foreground hover:bg-surface-hover":
              variant === "ghost",
            "bg-transparent border-border text-foreground hover:bg-surface-hover":
              variant === "outline",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
