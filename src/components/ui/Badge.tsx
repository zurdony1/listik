import clsx from "clsx";

interface Props {
  children: React.ReactNode;
  color?: "green" | "red" | "blue" | "yellow";
}

export default function Badge({
  children,
  color = "green",
}: Props) {
  return (
    <span
      className={clsx(
        "rounded-full px-3 py-1 text-xs font-bold",

        {
          "bg-green-100 text-green-700": color === "green",

          "bg-red-100 text-red-700": color === "red",

          "bg-blue-100 text-blue-700": color === "blue",

          "bg-yellow-100 text-yellow-700":
            color === "yellow",
        }
      )}
    >
      {children}
    </span>
  );
}