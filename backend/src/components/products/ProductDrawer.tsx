import { useEffect, useState } from "react";

import type { Product } from "../../services/productAdminService";

import {
  getPresentations,
  type ProductPresentation,
} from "../../services/presentationService";

import Tabs from "../ui/Tabs";
import CodeList from "./CodeList";
import AddCodeForm from "./AddCodeForm";

interface Props {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

export default function ProductDrawer({
  product,
  open,
  onClose,
}: Props) {
  const [presentations, setPresentations] =
    useState<ProductPresentation[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState("info");

  const [
    addingCodeToPresentation,
    setAddingCodeToPresentation,
  ] = useState<string | null>(null);

  const [
    codeRefreshKeys,
    setCodeRefreshKeys,
  ] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!product || !open) {
      return;
    }

    setActiveTab("info");
    setAddingCodeToPresentation(null);

    loadPresentations();
  }, [product, open]);

  async function loadPresentations() {
    if (!product) {
      return;
    }

    try {
      setLoading(true);

      const data =
        await getPresentations(
          product.id,
        );

      setPresentations(data);
    } catch (error) {
      console.error(
        "Error cargando presentaciones:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCodeCreated(
    presentationId: string,
  ) {
    setAddingCodeToPresentation(null);

    setCodeRefreshKeys(
      (current) => ({
        ...current,

        [presentationId]:
          (current[presentationId] ?? 0) +
          1,
      }),
    );
  }

  if (!open || !product) {
    return null;
  }

  const tabs = [
    {
      id: "info",
      label: "Información",

      content: (
        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-black text-slate-900">
              Información general
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Marca
                </p>

                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 font-bold text-slate-900">
                  {product.brand ??
                    "Sin marca"}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Categoría
                </p>

                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 font-bold text-slate-900">
                  {product.category ??
                    "Sin categoría"}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Nombre del producto
              </p>

              <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 font-bold text-slate-900">
                {product.name}
              </div>
            </div>

            {product.normalized_name && (
              <div className="mt-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Nombre normalizado
                </p>

                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm text-slate-600">
                  {
                    product.normalized_name
                  }
                </div>
              </div>
            )}

            <button
              type="button"
              className="mt-5 w-full rounded-2xl border border-slate-300 bg-white py-3 font-black text-slate-700 transition hover:bg-slate-100"
            >
              Editar información
            </button>
          </section>
        </div>
      ),
    },

    {
      id: "presentations",
      label: "Presentaciones",

      content: (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Presentaciones
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Tamaños, empaques y códigos
                asociados.
              </p>
            </div>

            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-black text-green-700">
              {presentations.length}
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="font-semibold text-slate-500">
                Cargando presentaciones...
              </p>
            </div>
          ) : presentations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="font-black text-slate-800">
                Sin presentaciones
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Este producto todavía no
                tiene presentaciones
                registradas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {presentations.map(
                (presentation) => {
                  const isAddingCode =
                    addingCodeToPresentation ===
                    presentation.id;

                  return (
                    <div
                      key={presentation.id}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div>
                        <p className="font-black text-slate-900">
                          {
                            presentation.presentation_name
                          }
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {presentation.size_value !==
                          null
                            ? `${presentation.size_value} ${
                                presentation.size_unit ??
                                ""
                              }`
                            : "Sin medida"}

                          {presentation.units_per_package
                            ? ` • ${presentation.units_per_package} piezas`
                            : ""}
                        </p>

                        {presentation.package_type && (
                          <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                            {
                              presentation.package_type
                            }
                          </span>
                        )}
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                          Códigos por
                          supermercado
                        </p>

                        <CodeList
                          presentationId={
                            presentation.id
                          }
                          refreshKey={
                            codeRefreshKeys[
                              presentation.id
                            ] ?? 0
                          }
                        />
                      </div>

                      {!isAddingCode && (
                        <button
                          type="button"
                          onClick={() =>
                            setAddingCodeToPresentation(
                              presentation.id,
                            )
                          }
                          className="mt-4 w-full rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-green-400 hover:bg-green-50 hover:text-green-700"
                        >
                          + Agregar código
                        </button>
                      )}

                      {isAddingCode && (
                        <AddCodeForm
                          productId={
                            product.id
                          }
                          presentationId={
                            presentation.id
                          }
                          onCreated={() =>
                            handleCodeCreated(
                              presentation.id,
                            )
                          }
                          onCancel={() =>
                            setAddingCodeToPresentation(
                              null,
                            )
                          }
                        />
                      )}
                    </div>
                  );
                },
              )}
            </div>
          )}

          <button
            type="button"
            className="mt-5 w-full rounded-2xl bg-green-600 py-3 font-black text-white transition hover:bg-green-700"
          >
            + Nueva presentación
          </button>
        </div>
      ),
    },

    {
      id: "learning",
      label: "Historial IA",

      content: (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-green-600">
              Listik Brain
            </p>

            <h3 className="mt-2 text-xl font-black text-slate-900">
              Historial de aprendizaje
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Aquí mostraremos cómo ha
              aprendido Listik a reconocer
              este producto en distintos
              tickets y supermercados.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase text-slate-400">
                Coincidencias
              </p>

              <p className="mt-2 text-3xl font-black text-slate-900">
                —
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase text-slate-400">
                Confianza
              </p>

              <p className="mt-2 text-3xl font-black text-green-600">
                —
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="font-black text-slate-800">
              Próximamente
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Veremos nombres detectados,
              número de confirmaciones,
              correcciones y última vez que
              apareció este producto.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={onClose}
    >
      <aside
        className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-600">
                Catálogo Maestro
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-900">
                {product.name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {product.brand ??
                  "Sin marca"}
                {" · "}
                {product.category ??
                  "Sin categoría"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 font-black text-slate-600 transition hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="p-6">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </aside>
    </div>
  );
}