import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Brain,
  CheckCircle2,
  Package,
  X,
} from "lucide-react";

import type {
  LearningItem,
} from "../../services/api/learningApi";

import {
  getSmartSuggestion,
  type SmartSuggestionSource,
} from "../../services/api/suggestionApi";

export interface LearningApprovalForm {
  productName: string;
  brand: string;
  category: string;

  presentationName: string;
  sizeValue: number | null;
  sizeUnit: string;
  packageType: string;
}

interface Props {
  item: LearningItem | null;

  open: boolean;

  saving: boolean;

  onClose: () => void;

  onApprove: (
    data: LearningApprovalForm,
  ) => Promise<void>;
}

export default function ApproveLearningDrawer({
  item,
  open,
  saving,
  onClose,
  onApprove,
}: Props) {
  const [
    productName,
    setProductName,
  ] = useState("");

  const [
    brand,
    setBrand,
  ] = useState("");

  const [
    category,
    setCategory,
  ] = useState("");

  const [
    presentationName,
    setPresentationName,
  ] = useState("");

  const [
    sizeValue,
    setSizeValue,
  ] = useState("");

  const [
    sizeUnit,
    setSizeUnit,
  ] = useState("");

  const [
    packageType,
    setPackageType,
  ] = useState("");

  const [
    loadingSuggestion,
    setLoadingSuggestion,
  ] = useState(false);

  const [
    suggestionSource,
    setSuggestionSource,
  ] =
    useState<
      SmartSuggestionSource | null
    >(null);

  const [
    suggestionConfidence,
    setSuggestionConfidence,
  ] =
    useState(0);

  useEffect(() => {
    if (
      !item ||
      !open
    ) {
      return;
    }

    const currentItem =
      item;

    let cancelled =
      false;

    /*
     * RESET TOTAL
     */
    setProductName(
      currentItem.raw_name,
    );

    setBrand("");
    setCategory("");

    setPresentationName("");

    setSizeValue("");
    setSizeUnit("");
    setPackageType("");

    setSuggestionSource(
      null,
    );

    setSuggestionConfidence(
      0,
    );

    async function loadSuggestion() {
      try {
        setLoadingSuggestion(
          true,
        );

        const data =
          await getSmartSuggestion(
            currentItem.raw_name,
          );

        if (cancelled) {
          return;
        }

        const suggestion =
          data.suggestion;

        setSuggestionSource(
          suggestion.source,
        );

        setSuggestionConfidence(
          suggestion.confidence,
        );

        setProductName(
          suggestion.productName ||
            currentItem.raw_name,
        );

        setBrand(
          suggestion.brand ??
            "",
        );

        setCategory(
          suggestion.category ??
            "",
        );

        setPresentationName(
          suggestion.presentationName ||
            "",
        );

        setSizeValue(
          suggestion.sizeValue != null
            ? String(
                suggestion.sizeValue,
              )
            : "",
        );

        setSizeUnit(
          suggestion.sizeUnit ??
            "",
        );

        setPackageType(
          suggestion.packageType ??
            "",
        );
      } catch (error) {
        console.error(
          "Error cargando Smart Suggestion:",
          error,
        );

        if (!cancelled) {
          setProductName(
            currentItem.raw_name,
          );

          setBrand("");
          setCategory("");

          setPresentationName("");

          setSizeValue("");
          setSizeUnit("");
          setPackageType("");

          setSuggestionSource(
            null,
          );

          setSuggestionConfidence(
            0,
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSuggestion(
            false,
          );
        }
      }
    }

    loadSuggestion();

    return () => {
      cancelled = true;
    };
  }, [
    item,
    open,
  ]);

  if (
    !open ||
    !item
  ) {
    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !productName.trim() ||
      !presentationName.trim()
    ) {
      return;
    }

    const parsedSize =
      sizeValue.trim()
        ? Number(
            sizeValue,
          )
        : null;

    await onApprove({
      productName:
        productName.trim(),

      brand:
        brand.trim(),

      category:
        category.trim(),

      presentationName:
        presentationName.trim(),

      sizeValue:
        parsedSize !== null &&
        Number.isFinite(
          parsedSize,
        )
          ? parsedSize
          : null,

      sizeUnit:
        sizeUnit.trim(),

      packageType:
        packageType.trim(),
    });
  }

  function getSourceLabel() {
    if (
      suggestionSource ===
      "memory"
    ) {
      return "🧠 Memoria";
    }

    if (
      suggestionSource ===
      "catalog"
    ) {
      return "📦 Catálogo";
    }

    return "✨ Reglas";
  }

  function getSourceClasses() {
    if (
      suggestionSource ===
      "memory"
    ) {
      return (
        "bg-violet-100 " +
        "text-violet-700"
      );
    }

    if (
      suggestionSource ===
      "catalog"
    ) {
      return (
        "bg-green-100 " +
        "text-green-700"
      );
    }

    return (
      "bg-pink-100 " +
      "text-pink-700"
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={() => {
        if (!saving) {
          onClose();
        }
      }}
    >
      <aside
        className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* HEADER */}

        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-5 p-6">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100">
                <Brain
                  size={24}
                  className="text-violet-700"
                />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-violet-600">
                  Brain Queue
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  Aprobar aprendizaje
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Revisa la sugerencia del Brain
                  antes de agregarla al catálogo.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <form
          onSubmit={
            handleSubmit
          }
          className="p-6"
        >
          {/* OCR */}

          <section className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-violet-600">
              Texto detectado
            </p>

            <p className="mt-2 text-xl font-black text-slate-900">
              {item.raw_name}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                {item.store_name ??
                  "Sin supermercado"}
              </span>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-violet-700">
                {item.confidence}% confianza
              </span>

              {item.raw_code && (
                <span className="rounded-full bg-white px-3 py-1 font-mono text-xs font-bold text-slate-600">
                  {item.raw_code}
                </span>
              )}
            </div>

            {loadingSuggestion && (
              <div className="mt-4 rounded-2xl bg-white/70 p-3">
                <p className="text-sm font-black text-violet-700">
                  🧠 Analizando producto...
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Consultando memoria,
                  catálogo y reglas.
                </p>
              </div>
            )}
          </section>

          {/* FUENTE */}

          {!loadingSuggestion &&
            suggestionSource && (
              <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Sugerencia del Brain
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${getSourceClasses()}`}
                  >
                    {getSourceLabel()}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    {
                      suggestionConfidence
                    }
                    % confianza
                  </span>
                </div>
              </section>
            )}

          {/* PRODUCTO */}

          <section className="mt-6">
            <div className="flex items-center gap-2">
              <Package
                size={18}
                className="text-green-600"
              />

              <h3 className="font-black text-slate-900">
                Producto
              </h3>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Nombre *
                </label>

                <input
                  value={
                    productName
                  }
                  onChange={(event) =>
                    setProductName(
                      event.target.value,
                    )
                  }
                  placeholder="Ej. Tostitos Original"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Marca
                  </label>

                  <input
                    value={brand}
                    onChange={(event) =>
                      setBrand(
                        event.target.value,
                      )
                    }
                    placeholder="Ej. Tostitos"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Categoría
                  </label>

                  <input
                    value={
                      category
                    }
                    onChange={(event) =>
                      setCategory(
                        event.target.value,
                      )
                    }
                    placeholder="Ej. Botanas"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* PRESENTACIÓN */}

          <section className="mt-8 border-t border-slate-200 pt-7">
            <h3 className="font-black text-slate-900">
              Presentación
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              El Brain intentará extraer
              cantidad, unidad y tipo de empaque.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Nombre de presentación *
                </label>

                <input
                  value={
                    presentationName
                  }
                  onChange={(event) =>
                    setPresentationName(
                      event.target.value,
                    )
                  }
                  placeholder="Ej. Paquete 10 piezas"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Cantidad
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={
                      sizeValue
                    }
                    onChange={(event) =>
                      setSizeValue(
                        event.target.value,
                      )
                    }
                    placeholder="Ej. 10"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Unidad
                  </label>

                  <input
                    value={
                      sizeUnit
                    }
                    onChange={(event) =>
                      setSizeUnit(
                        event.target.value,
                      )
                    }
                    placeholder="Ej. ml, g, pieza"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Empaque
                  </label>

                  <input
                    value={
                      packageType
                    }
                    onChange={(event) =>
                      setPackageType(
                        event.target.value,
                      )
                    }
                    placeholder="Ej. Botella"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* RESUMEN */}

          <section className="mt-8 rounded-2xl bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Al aprobar
            </p>

            <div className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
              <p>
                ✓ Se creará el producto.
              </p>

              <p>
                ✓ Se creará la presentación.
              </p>

              {item.raw_code && (
                <p>
                  ✓ Se registrará el código
                  del supermercado.
                </p>
              )}

              <p>
                ✓ Se guardará una memoria
                del Brain.
              </p>

              <p>
                ✓ Listik podrá reconocerlo
                en futuros tickets.
              </p>
            </div>
          </section>

          {/* BOTONES */}

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-6">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                loadingSuggestion ||
                !productName.trim() ||
                !presentationName.trim()
              }
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2
                size={18}
              />

              {saving
                ? "Aprendiendo..."
                : loadingSuggestion
                  ? "Analizando..."
                  : "Aprobar y aprender"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}