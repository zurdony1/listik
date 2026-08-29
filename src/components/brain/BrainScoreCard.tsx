interface Props {
  score: number;

  previousMemories: number;

  source?:
    | "code"
    | "name"
    | "memory"
    | "manual";

  confidence: number;
}

export default function BrainScoreCard({
  score,
  previousMemories,
  source,
  confidence,
}: Props) {
  function getLabel() {
    if (score >= 90) {
      return "Confianza muy alta";
    }

    if (score >= 70) {
      return "Buena confianza";
    }

    if (score >= 50) {
      return "Requiere revisión";
    }

    return "Confianza baja";
  }

  function getSourceLabel() {
    if (source === "code") {
      return "Código";
    }

    if (source === "memory") {
      return "Memoria";
    }

    if (source === "name") {
      return "Nombre";
    }

    if (source === "manual") {
      return "Selección manual";
    }

    return "Desconocido";
  }

  return (
    <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-violet-600">
            🧠 Listik Brain
          </p>

          <p className="mt-1 font-black text-slate-900">
            {getLabel()}
          </p>
        </div>

        <div className="text-right">
          <p className="text-3xl font-black text-violet-700">
            {score}%
          </p>

          <p className="text-xs font-bold text-slate-500">
            Brain Score
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-violet-100">
        <div
          className="h-full rounded-full bg-violet-600 transition-all duration-500"
          style={{
            width: `${Math.min(
              Math.max(score, 0),
              100,
            )}%`,
          }}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-3">
          <p className="text-xs font-bold uppercase text-slate-400">
            Método
          </p>

          <p className="mt-1 font-black text-slate-800">
            {getSourceLabel()}
          </p>
        </div>

        <div className="rounded-xl bg-white p-3">
          <p className="text-xs font-bold uppercase text-slate-400">
            Coincidencia
          </p>

          <p className="mt-1 font-black text-slate-800">
            {confidence}%
          </p>
        </div>

        <div className="rounded-xl bg-white p-3">
          <p className="text-xs font-bold uppercase text-slate-400">
            Memorias previas
          </p>

          <p className="mt-1 font-black text-slate-800">
            {previousMemories}
          </p>
        </div>
      </div>
    </div>
  );
}