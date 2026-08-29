interface Props {
  title: string;
  value: number;
  color: string;
}

export default function ProductStats({
  title,
  value,
  color,
}: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">
        {title}
      </p>

      <h2
        className={`mt-3 text-4xl font-black ${color}`}
      >
        {value.toLocaleString("es-MX")}
      </h2>
    </div>
  );
}