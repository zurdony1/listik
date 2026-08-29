import {
  useEffect,
  useMemo,
  useState,
} from "react";

import toast from "react-hot-toast";

import ApproveLearningDrawer, {
  type LearningApprovalForm,
} from "../components/learning/ApproveLearningDrawer";

import {
  approveLearning,
  getLearningQueue,
  updateLearningStatus,
  type LearningItem,
} from "../services/api/learningApi";

export default function AdminLearning() {
  const [items, setItems] =
    useState<LearningItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    processingId,
    setProcessingId,
  ] =
    useState<string | null>(null);

  const [
    selectedItem,
    setSelectedItem,
  ] =
    useState<LearningItem | null>(
      null,
    );

  const [
    approveDrawerOpen,
    setApproveDrawerOpen,
  ] =
    useState(false);

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue() {
    try {
      setLoading(true);

      const data =
        await getLearningQueue();

      setItems(data);
    } catch (error) {
      console.error(
        "Error cargando Brain Queue:",
        error,
      );

      toast.error(
        "No se pudo cargar Brain Queue.",
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredItems =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      if (!term) {
        return items;
      }

      return items.filter(
        (item) =>
          item.raw_name
            .toLowerCase()
            .includes(term) ||
          (
            item.store_name ??
            ""
          )
            .toLowerCase()
            .includes(term) ||
          (
            item.raw_code ??
            ""
          )
            .toLowerCase()
            .includes(term),
      );
    }, [
      items,
      search,
    ]);

  function handleOpenApprove(
    item: LearningItem,
  ) {
    setSelectedItem(item);
    setApproveDrawerOpen(true);
  }

  function handleCloseApprove() {
    if (processingId) {
      return;
    }

    setApproveDrawerOpen(false);
    setSelectedItem(null);
  }

  async function handleApprove(
    form:
      LearningApprovalForm,
  ) {
    if (!selectedItem) {
      return;
    }

    try {
      setProcessingId(
        selectedItem.id,
      );

      const result =
        await approveLearning(
          selectedItem.id,
          {
            rawName:
              selectedItem.raw_name,

            rawCode:
              selectedItem.raw_code,

            storeName:
              selectedItem.store_name,

            product: {
              name:
                form.productName,

              brand:
                form.brand ||
                null,

              category:
                form.category ||
                null,
            },

            presentation: {
              presentationName:
                form.presentationName,

              sizeValue:
                form.sizeValue,

              sizeUnit:
                form.sizeUnit ||
                null,

              packageType:
                form.packageType ||
                null,
            },
          },
        );

      setItems(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              selectedItem.id,
          ),
      );

      toast.success(
        `🧠 Listik aprendió: ${result.product.name}`,
      );

      setApproveDrawerOpen(
        false,
      );

      setSelectedItem(null);
    } catch (error) {
      console.error(
        "Error aprobando aprendizaje:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo aprobar el aprendizaje.",
      );

      throw error;
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(
    item: LearningItem,
  ) {
    try {
      setProcessingId(
        item.id,
      );

      await updateLearningStatus(
        item.id,
        "rejected",
      );

      setItems(
        (current) =>
          current.filter(
            (currentItem) =>
              currentItem.id !==
              item.id,
          ),
      );

      toast.success(
        `${item.raw_name} fue rechazado.`,
      );
    } catch (error) {
      console.error(
        "Error rechazando aprendizaje:",
        error,
      );

      toast.error(
        "No se pudo rechazar el producto.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="font-bold text-slate-500">
              🧠 Cargando Brain Queue...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl">

          {/* HEADER */}

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-violet-600">
                Inteligencia
              </p>

              <h1 className="mt-2 text-4xl font-black text-slate-900">
                🧠 Brain Queue
              </h1>

              <p className="mt-2 text-slate-500">
                Revisa lo que Listik todavía
                necesita aprender.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Pendientes
              </p>

              <p className="mt-1 text-3xl font-black text-violet-600">
                {items.length}
              </p>
            </div>
          </div>

          {/* BUSCADOR */}

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Buscar por producto, supermercado o código..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
          </section>

          {/* EMPTY */}

          {filteredItems.length ===
          0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-2xl font-black text-slate-800">
                🎉 Sin pendientes
              </p>

              <p className="mt-2 text-slate-500">
                No encontramos productos
                esperando revisión.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-5">

              {/* ITEMS */}

              {filteredItems.map(
                (item) => {
                  const processing =
                    processingId ===
                    item.id;

                  return (
                    <article
                      key={item.id}
                      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-5">
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                            Texto detectado
                          </p>

                          <h2 className="mt-1 text-2xl font-black text-slate-900">
                            {item.raw_name}
                          </h2>

                          <p className="mt-2 font-bold text-slate-500">
                            {item.store_name ??
                              "Sin supermercado"}
                          </p>

                          {item.raw_code && (
                            <p className="mt-2 font-mono text-xs font-bold text-slate-500">
                              Código:{" "}
                              {
                                item.raw_code
                              }
                            </p>
                          )}

                          <p className="mt-3 text-xs text-slate-400">
                            Detectado:{" "}
                            {new Date(
                              item.created_at,
                            ).toLocaleString(
                              "es-MX",
                            )}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-4xl font-black text-violet-600">
                            {
                              item.confidence
                            }
                            %
                          </p>

                          <p className="text-sm font-bold text-slate-500">
                            Confianza
                          </p>

                          <span className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            handleOpenApprove(
                              item,
                            )
                          }
                          className="rounded-xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          Aprobar
                        </button>

                        <button
                          type="button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            handleOpenApprove(
                              item,
                            )
                          }
                          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            handleReject(
                              item,
                            )
                          }
                          className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {processing
                            ? "Procesando..."
                            : "Rechazar"}
                        </button>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </div>
      </main>

      {/* DRAWER */}

      <ApproveLearningDrawer
        item={selectedItem}
        open={
          approveDrawerOpen
        }
        saving={
          Boolean(
            selectedItem &&
              processingId ===
                selectedItem.id,
          )
        }
        onClose={
          handleCloseApprove
        }
        onApprove={
          handleApprove
        }
      />
    </>
  );
}