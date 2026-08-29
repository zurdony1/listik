import type { HTMLAttributes } from "react";
import clsx from "clsx";

interface Props extends HTMLAttributes<HTMLDivElement> {}

export default function Card({
  children,
  className,
  ...props
}: Props) {
  return (
    <div
      className={clsx(
        "rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:shadow-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}