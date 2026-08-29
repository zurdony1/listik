interface Props {
  value: number;
}

export default function BrainProgress({
  value,
}: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

      <p className="text-sm font-black uppercase tracking-widest text-green-600">
        Nivel de conocimiento
      </p>

      <div className="mt-6 h-5 overflow-hidden rounded-full bg-slate-200">

        <div
          className="h-full rounded-full bg-green-600 transition-all duration-700"
          style={{
            width: `${value}%`,
          }}
        />

      </div>

      <h2 className="mt-5 text-5xl font-black text-slate-900">
        {value}%
      </h2>

      <p className="mt-2 text-slate-500">
        El Brain mejora con cada ticket confirmado.
      </p>

    </div>
  );
}