import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = "secondary",
  size = "md",
  ...props
}) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200",
    ghost: "hover:bg-slate-800 text-slate-400 hover:text-slate-200",
    danger: "hover:bg-red-900/30 text-red-400 hover:text-red-300",
  };

  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
    icon: "p-2",
  };

  return (
    <button
      className={cn(
        "rounded font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
};
