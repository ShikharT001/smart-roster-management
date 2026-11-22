import React from "react";
import clsx from "clsx";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={clsx(
            "w-full px-3 py-1.5 text-sm bg-surface text-foreground border rounded-md placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent",
            error ? "border-red-500 focus:ring-red-500" : "border-border",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
        {!error && helperText && (
          <span className="text-xs text-muted-foreground text-slate-500">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
