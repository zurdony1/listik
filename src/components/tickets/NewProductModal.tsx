import {
  useEffect,
  useState,
} from "react";

import {
  X,
  PackagePlus,
  CheckCircle2,
} from "lucide-react";

import {
  approveLearning,
} from "../../services/api/learningApi";

interface CreatedProduct {
  productId: string;

  productName: string;

  presentationId: string;

  presentationName: string;
}

interface Props {
  open: boolean;

  learningId:
    | string
    | null
    | undefined;

  rawName: string;

  rawCode?:
    | string
    | null;

  storeName?:
    | string
    | null;

  onClose: () => void;

  onCreated: (
    result: CreatedProduct,
  ) => void;
}

export default function NewProductModal({
  open,
  learningId,
  rawName,
  rawCode,
  storeName,
  onClose,
  onCreated,
}: Props) {
  const [
    name,
    setName,
  ] =
    useState("");

  const [
    brand,
    setBrand,
  ] =
    useState("");

  const [
    category,
    setCategory,
  ] =
    useState("");

  const [
    presentationName,
    setPresentationName,
  ] =
    useState("");

  const [
    sizeValue,
    setSizeValue,
  ] =
    useState("");

  const [
    sizeUnit,
    setSizeUnit,
  ] =
    useState("");

  const [
    packageType,
    setPackageType,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  /*
   * ==========================================
   * RESETEAR FORMULARIO
   * ==========================================
   */

  useEffect(() => {
    if (!open) {
      return;
    }

    /*
     * Usamos el texto OCR como
     * punto de partida.
     *
     * El usuario puede corregirlo.
     */
    setName(
      rawName,
    );

    setBrand("");

    setCategory("");

    setPresentationName("");

    setSizeValue("");

    setSizeUnit("");

    setPackageType("");

    setError("");
  }, [
    open,
    rawName,
  ]);

  /*
   * ==========================================
   * CREAR PRODUCTO
   * ==========================================
   */

  async function handleCreate() {
    if (!learningId) {
      setError(
        "Este artículo no tiene learningId. Analiza nuevamente el ticket.",
      );

      return;
    }

    if (!name.trim()) {
      setError(
        "Escribe el nombre correcto del producto.",
      );

      return;
    }

    if (
      !presentationName.trim()
    ) {
      setError(
        "Escribe la presentación del producto.",
      );

      return;
    }

    try {
      setLoading(
        true,
      );

      setError("");

      const result =
        await approveLearning(
          learningId,
          {
            rawName,

            rawCode:
              rawCode ??
              null,

            storeName:
              storeName ??
              null,

            product: {
              name:
                name.trim(),

              brand:
                brand.trim() ||
                null,

              category:
                category.trim() ||
                null,
            },

            presentation: {
              presentationName:
                presentationName.trim(),

              sizeValue:
                sizeValue.trim()
                  ? Number(
                      sizeValue,
                    )
                  : null,

              sizeUnit:
                sizeUnit.trim() ||
                null,

              packageType:
                packageType.trim() ||
                null,
            },
          },
        );

      /*
       * Devolvemos los IDs creados
       * a AdminTickets.
       */
      onCreated({
        productId:
          String(
            result.product.id,
          ),

        productName:
          String(
            result.product.name,
          ),

        presentationId:
          String(
            result.presentation.id,
          ),

        presentationName:
          String(
            result.presentation
              .presentation_name,
          ),
      });
    } catch (error) {
      console.error(
        "Error creando producto:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo crear el producto.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"
      onClick={
        onClose
      }
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-product-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(
          event,
        ) =>
          event.stopPropagation()
        }
      >
        {/* HEADER */}

        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-green-600">
              Listik Learning
            </p>

            <h2
              id="new-product-title"
              className="mt-1 text-2xl font-black text-slate-900"
            >
              Crear producto nuevo
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Corrige la información
              detectada por el ticket.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Cerrar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <X
              size={20}
            />
          </button>
        </div>

        {/* CONTENIDO */}

        <div className="max-h-[68vh] overflow-y-auto p-6">
          {/* INFORMACIÓN OCR */}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
              Texto detectado
            </p>

            <p className="mt-2 font-black text-slate-900">
              {rawName}
            </p>

            {rawCode && (
              <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                Código:{" "}
                {rawCode}
              </p>
            )}

            {storeName && (
              <p className="mt-1 text-xs font-bold text-slate-500">
                Tienda:{" "}
                {storeName}
              </p>
            )}
          </div>

          {/* PRODUCTO */}

          <div className="mt-6">
            <p className="text-xs font-black uppercase tracking-widest text-green-600">
              Producto
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Nombre correcto
                </label>

                <input
                  type="text"
                  value={
                    name
                  }
                  onChange={(
                    event,
                  ) =>
                    setName(
                      event.target.value,
                    )
                  }
                  placeholder="Ejemplo: Mix Barcel"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Marca
                </label>

                <input
                  type="text"
                  value={
                    brand
                  }
                  onChange={(
                    event,
                  ) =>
                    setBrand(
                      event.target.value,
                    )
                  }
                  placeholder="Ejemplo: Barcel"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Categoría
                </label>

                <input
                  type="text"
                  value={
                    category
                  }
                  onChange={(
                    event,
                  ) =>
                    setCategory(
                      event.target.value,
                    )
                  }
                  placeholder="Ejemplo: Botanas"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />
              </div>
            </div>
          </div>

          {/* PRESENTACIÓN */}

          <div className="mt-8">
            <p className="text-xs font-black uppercase tracking-widest text-green-600">
              Presentación
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Nombre de presentación
                </label>

                <input
                  type="text"
                  value={
                    presentationName
                  }
                  onChange={(
                    event,
                  ) =>
                    setPresentationName(
                      event.target.value,
                    )
                  }
                  placeholder="Ejemplo: Paquete surtido"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Tamaño
                </label>

                <input
                  type="number"
                  step="any"
                  value={
                    sizeValue
                  }
                  onChange={(
                    event,
                  ) =>
                    setSizeValue(
                      event.target.value,
                    )
                  }
                  placeholder="Ejemplo: 600"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Unidad
                </label>

                <input
                  type="text"
                  value={
                    sizeUnit
                  }
                  onChange={(
                    event,
                  ) =>
                    setSizeUnit(
                      event.target.value,
                    )
                  }
                  placeholder="ml, g, kg..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Tipo de empaque
                </label>

                <input
                  type="text"
                  value={
                    packageType
                  }
                  onChange={(
                    event,
                  ) =>
                    setPackageType(
                      event.target.value,
                    )
                  }
                  placeholder="Caja, bolsa, botella, paquete..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />
              </div>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="font-bold text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* EXPLICACIÓN */}

          <div className="mt-6 rounded-2xl bg-violet-50 p-4">
            <p className="font-black text-violet-700">
              🧠 Listik aprenderá esta corrección
            </p>

            <p className="mt-1 text-sm text-violet-700">
              Se creará el producto,
              la presentación, el código
              de esta tienda y una memoria
              para reconocerlo en futuros
              tickets.
            </p>
          </div>
        </div>

        {/* FOOTER */}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              loading
            }
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={
              handleCreate
            }
            disabled={
              loading ||
              !learningId
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? (
              <>
                <PackagePlus
                  size={18}
                />

                Creando...
              </>
            ) : (
              <>
                <CheckCircle2
                  size={18}
                />

                Crear y enseñar a Listik
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}