interface Props {
  confidence: number;
}

export default function MatchBadge({
  confidence,
}: Props) {
  if (confidence >= 90) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
        <span>●</span>
        Coincidencia alta · {confidence}%
      </span>
    );
  }

  if (confidence >= 70) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
        <span>●</span>
        Revisar · {confidence}%
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
      <span>●</span>
      Sin coincidencia · {confidence}%
    </span>
  );
}