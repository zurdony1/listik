import { useState } from "react";
import toast from "react-hot-toast";

import {
  createProductCode,
} from "../../services/codeService";

interface Props {
  productId: string;
  presentationId: string;
  onCreated: () => void;
  onCancel: () => void;
}

export default function AddCodeForm({
  productId,
  presentationId,
  onCreated,
  onCancel,
}: Props) {
  const [storeName, setStoreName] =
    useState("");

  const [code, setCode] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  async function handleSave() {
    if (!storeName.trim()) {
      toast.error(
        "Escribe el nombre del supermercado.",
      );

      return;
    }

    if (!code.trim()) {
      toast.error(
        "Escribe el código del producto.",
      );

      return;
    }

    try {
      setSaving(true);

      await createProductCode({
        productId,
        presentationId,
        storeName,
        code,
      });

      toast.success(
        "Código agregado correctamente.",
      );

      onCreated();
    } catch (error) {
      console.error(
        "Error creando código:",
        error,
      );

      toast.error(
        "No se pudo guardar el código.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
      <p className="font-black text-slate-900">
        Nuevo código
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="text-xs font-black uppercase tracking-wide text-slate-500">
            Supermercado
          </label>

          <input
            value={storeName}
            onChange={(event) =>
              setStoreName(
                event.target.value,
              )
            }
            placeholder="Ejemplo: Sam's Club"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          />
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wide text-slate-500">
            Código
          </label>

          <input
            value={code}
            onChange={(event) =>
              setCode(
                event.target.value,
              )
            }
            placeholder="Ejemplo: 980007627"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-black text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving
              ? "Guardando..."
              : "Guardar código"}
          </button>
        </div>
      </div>
    </div>
  );
}