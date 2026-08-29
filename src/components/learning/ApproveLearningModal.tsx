import { useState } from "react";

interface Props {
  open: boolean;

  rawName: string;

  onClose: () => void;

  onSave: (data: {
    productName: string;
    brand: string;
    category: string;
    presentation: string;
    sizeValue: number;
    sizeUnit: string;
    packageType: string;
  }) => Promise<void>;
}

export default function ApproveLearningModal({
  open,
  rawName,
  onClose,
  onSave,
}: Props) {
  const [productName, setProductName] =
    useState(rawName);

  const [brand, setBrand] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [presentation, setPresentation] =
    useState("");

  const [sizeValue, setSizeValue] =
    useState(1);

  const [sizeUnit, setSizeUnit] =
    useState("");

  const [packageType, setPackageType] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  if (!open) return null;

  async function handleSave() {
    try {
      setSaving(true);

      await onSave({
        productName,
        brand,
        category,
        presentation,
        sizeValue,
        sizeUnit,
        packageType,
      });

      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

      <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-xl">

        <h2 className="text-2xl font-black">
          Aprobar aprendizaje
        </h2>

        <p className="mt-1 text-slate-500">
          Texto OCR:
          <span className="ml-2 font-bold">
            {rawName}
          </span>
        </p>

        <div className="mt-6 space-y-4">

          <input
            className="w-full rounded-xl border p-3"
            placeholder="Nombre del producto"
            value={productName}
            onChange={(e)=>
              setProductName(
                e.target.value,
              )
            }
          />

          <input
            className="w-full rounded-xl border p-3"
            placeholder="Marca"
            value={brand}
            onChange={(e)=>
              setBrand(
                e.target.value,
              )
            }
          />

          <input
            className="w-full rounded-xl border p-3"
            placeholder="Categoría"
            value={category}
            onChange={(e)=>
              setCategory(
                e.target.value,
              )
            }
          />

          <input
            className="w-full rounded-xl border p-3"
            placeholder="Presentación"
            value={presentation}
            onChange={(e)=>
              setPresentation(
                e.target.value,
              )
            }
          />

          <div className="grid grid-cols-3 gap-3">

            <input
              type="number"
              className="rounded-xl border p-3"
              value={sizeValue}
              onChange={(e)=>
                setSizeValue(
                  Number(
                    e.target.value,
                  ),
                )
              }
            />

            <input
              className="rounded-xl border p-3"
              placeholder="Unidad"
              value={sizeUnit}
              onChange={(e)=>
                setSizeUnit(
                  e.target.value,
                )
              }
            />

            <input
              className="rounded-xl border p-3"
              placeholder="Empaque"
              value={packageType}
              onChange={(e)=>
                setPackageType(
                  e.target.value,
                )
              }
            />

          </div>

        </div>

        <div className="mt-8 flex justify-end gap-3">

          <button
            onClick={onClose}
            className="rounded-xl border px-5 py-3 font-bold"
          >
            Cancelar
          </button>

          <button
            disabled={saving}
            onClick={handleSave}
            className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white"
          >
            {saving
              ? "Guardando..."
              : "Guardar"}
          </button>

        </div>

      </div>

    </div>
  );
}