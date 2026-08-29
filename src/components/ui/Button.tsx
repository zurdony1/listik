import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger";
}

export default function Button({
  variant = "primary",
  className,
  children,
  ...props
}: Props) {
  return (
    <button
      className={clsx(
        "rounded-2xl px-5 py-3 font-bold transition-all duration-200 active:scale-95",

        {
          "bg-green-600 text-white hover:bg-green-700 shadow":
            variant === "primary",

          "bg-slate-900 text-white hover:bg-slate-800":
            variant === "secondary",

          "border border-slate-300 bg-white hover:bg-slate-50":
            variant === "outline",

          "bg-red-600 text-white hover:bg-red-700":
            variant === "danger",
        },

        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}