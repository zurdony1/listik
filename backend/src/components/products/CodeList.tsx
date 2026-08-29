import {
  useEffect,
  useState,
} from "react";

import {
  getCodesByPresentation,
  type ProductCode,
} from "../../services/codeService";

interface Props {
  presentationId: string;
  refreshKey?: number;
}

export default function CodeList({
  presentationId,
  refreshKey = 0,
}: Props) {
  const [codes, setCodes] =
    useState<ProductCode[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    loadCodes();
  }, [
    presentationId,
    refreshKey,
  ]);

  async function loadCodes() {
    try {
      setLoading(true);

      const data =
        await getCodesByPresentation(
          presentationId,
        );

      setCodes(data);
    } catch (error) {
      console.error(
        "Error cargando códigos:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <p className="mt-3 text-sm text-slate-500">
        Cargando códigos...
      </p>
    );
  }

  if (codes.length === 0) {
    return (
      <div className="mt-3 rounded-xl bg-slate-50 p-3">
        <p className="text-sm text-slate-500">
          Sin códigos registrados.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {codes.map((code) => (
        <div
          key={code.id}
          className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              {code.store_name}
            </p>

            <p className="mt-1 font-mono font-black text-slate-900">
              {code.code}
            </p>
          </div>

          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
            Código
          </span>
        </div>
      ))}
    </div>
  );
}