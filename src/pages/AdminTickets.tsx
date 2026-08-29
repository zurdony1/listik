import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import toast from "react-hot-toast";

import TicketProductCard from "../components/tickets/TicketProductCard";

import ProductSearchModal from "../components/tickets/ProductSearchModal";

import NewProductModal from "../components/tickets/NewProductModal";

import {
  analyzeTicket,
} from "../services/api/ticketApi";

import {
  saveTicketPrices,
} from "../services/api/ticketPriceApi";

import {
  saveBrainMemory,
} from "../services/brainMemoryService";

import type {
  TicketAnalysis,
  TicketItem,
  TicketItemStatus,
} from "../types/TicketAnalysis";

export default function AdminTickets() {
  /*
   * ==========================================
   * ESTADOS PRINCIPALES
   * ==========================================
   */

  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null,
    );

    const [
  creatingNewProductItem,
  setCreatingNewProductItem,
] = useState<TicketItem | null>(null);

  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState<
      string | null
    >(null);

  const [
    analysis,
    setAnalysis,
  ] =
    useState<
      TicketAnalysis | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    savingPrices,
    setSavingPrices,
  ] =
    useState(false);

  const [
    pricesSaved,
    setPricesSaved,
  ] =
    useState(false);

  /*
   * ==========================================
   * PRODUCTO QUE ESTAMOS BUSCANDO
   * ==========================================
   */

  const [
    searchItem,
    setSearchItem,
  ] =
    useState<
      TicketItem | null
    >(null);

  /*
   * ==========================================
   * PREVIEW
   * ==========================================
   */

  useEffect(() => {
    if (!file) {
      setPreviewUrl(
        null,
      );

      return;
    }

    const url =
      URL.createObjectURL(
        file,
      );

    setPreviewUrl(
      url,
    );

    return () => {
      URL.revokeObjectURL(
        url,
      );
    };
  }, [file]);

  /*
   * ==========================================
   * ESTADÍSTICAS
   * ==========================================
   */

  const confirmedCount =
    useMemo(() => {
      if (!analysis) {
        return 0;
      }

      return analysis.items.filter(
        (item) =>
          item.status ===
          "confirmed",
      ).length;
    }, [analysis]);

  const pendingCount =
    useMemo(() => {
      if (!analysis) {
        return 0;
      }

      return analysis.items.filter(
        (item) =>
          item.status ===
          "pending",
      ).length;
    }, [analysis]);

  const newProductsCount =
    useMemo(() => {
      if (!analysis) {
        return 0;
      }

      return analysis.items.filter(
        (item) =>
          item.status ===
          "new-product",
      ).length;
    }, [analysis]);

  const reviewedCount =
    confirmedCount +
    newProductsCount;

  const totalItems =
    analysis?.items.length ??
    0;

  const progress =
    totalItems >
    0
      ? Math.round(
          (
            reviewedCount /
            totalItems
          ) *
            100,
        )
      : 0;

  /*
   * Solo estos artículos
   * se convierten en precios.
   */
  const confirmedItems =
    useMemo(() => {
      if (!analysis) {
        return [];
      }

      return analysis.items.filter(
        (item) =>
          item.status ===
          "confirmed",
      );
    }, [analysis]);

  /*
   * ==========================================
   * IDS
   * ==========================================
   */

  function getProductId(
    item: TicketItem,
  ): string | null {
    return (
      item.suggestedProductId ??
      null
    );
  }

  function getPresentationId(
    item: TicketItem,
  ): string | null {
    return (
      item.suggestedPresentationId ??
      null
    );
  }

  /*
   * ==========================================
   * SELECCIONAR ARCHIVO
   * ==========================================
   */

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target
        .files?.[0];

    if (!selectedFile) {
      return;
    }

    setFile(
      selectedFile,
    );

    setAnalysis(
      null,
    );

    setSearchItem(
      null,
    );

    setPricesSaved(
      false,
    );
  }

  /*
   * ==========================================
   * ANALIZAR TICKET
   * ==========================================
   */

  async function handleAnalyzeTicket() {
    if (!file) {
      toast.error(
        "Selecciona una imagen del ticket.",
      );

      return;
    }

    try {
      setLoading(
        true,
      );

      setPricesSaved(
        false,
      );

      setSearchItem(
        null,
      );

      const data =
        await analyzeTicket(
          file,
        );

      console.log(
        "Respuesta del backend:",
        data,
      );

      if (!data.analysis) {
        throw new Error(
          data.error ??
            "El backend no devolvió un análisis.",
        );
      }

      const normalizedItems =
        data.analysis.items.map(
          (
            item,
            index,
          ) => ({
            ...item,

            id:
              item.id ||
              `ticket-item-${index}`,
          }),
        );

      setAnalysis({
        ...data.analysis,

        items:
          normalizedItems,
      });

      toast.success(
        "Ticket analizado correctamente.",
      );
    } catch (error) {
      console.error(
        "Error analizando ticket:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo analizar el ticket.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  /*
   * ==========================================
   * GUARDAR APRENDIZAJE
   * ==========================================
   */

  async function learnFromConfirmation(
    item: TicketItem,
  ) {
    if (!analysis) {
      return;
    }

    const productId =
      getProductId(
        item,
      );

    const presentationId =
      getPresentationId(
        item,
      );

    /*
     * No queremos guardar memoria
     * sin producto.
     */
    if (!productId) {
      throw new Error(
        `No se puede aprender "${item.rawName}" porque no tiene productId.`,
      );
    }

    await saveBrainMemory({
      rawName:
        item.rawName,

      rawCode:
        item.rawCode ??
        null,

      storeName:
        analysis.store ??
        null,

      productId,

      presentationId,

      confidence:
        item.confidence ??
        0,

      /*
       * Si viene de memory,
       * la confirmación humana
       * se registra como manual.
       */
      source:
        item.matchSource ===
        "memory"
          ? "manual"
          : item.matchSource ??
            "manual",

      accepted:
        true,
    });
  }

  /*
   * ==========================================
   * CAMBIAR ESTADO
   * ==========================================
   */

  async function handleStatusChange(
    itemId: string,
    status: TicketItemStatus,
  ) {
    if (!analysis) {
      return;
    }

    const item =
      analysis.items.find(
        (
          currentItem,
        ) =>
          currentItem.id ===
          itemId,
      );

    if (!item) {
      return;
    }

    /*
     * Cuando el usuario confirma,
     * guardamos memoria.
     */
    if (
      status ===
        "confirmed" &&
      item.status !==
        "confirmed"
    ) {
      try {
        await learnFromConfirmation(
          item,
        );

        toast.success(
          "Listik aprendió esta coincidencia 🧠",
        );
      } catch (error) {
        console.error(
          "Error guardando aprendizaje:",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo guardar el aprendizaje.",
        );

        return;
      }
    }

    setAnalysis(
      (
        currentAnalysis,
      ) => {
        if (
          !currentAnalysis
        ) {
          return null;
        }

        return {
          ...currentAnalysis,

          items:
            currentAnalysis.items.map(
              (
                currentItem,
              ) =>
                currentItem.id ===
                itemId
                  ? {
                      ...currentItem,

                      status,
                    }
                  : currentItem,
            ),
        };
      },
    );
  }

  /*
   * ==========================================
   * ABRIR BUSCADOR
   * ==========================================
   */

 function handleSearchProduct(
  item: TicketItem,
) {
  console.log(
    "🔎 ABRIENDO BUSCADOR:",
    item.rawName,
    item.id,
  );

  setSearchItem(item);
}

function handleCreateNewProduct() {
  if (!searchItem) {
    return;
  }

  console.log(
    "➕ CREAR PRODUCTO NUEVO:",
    searchItem.rawName,
    searchItem.learningId,
  );

  setCreatingNewProductItem(
    searchItem,
  );

  setSearchItem(
    null,
  );
}

function handleCloseNewProduct() {
  setCreatingNewProductItem(
    null,
  );
}

function handleProductCreated(
  result: {
    productId: string;
    productName: string;
    presentationId: string;
    presentationName: string;
  },
) {
  const currentItem =
    creatingNewProductItem;

  if (!currentItem) {
    return;
  }

  setAnalysis(
    (
      currentAnalysis,
    ) => {
      if (
        !currentAnalysis
      ) {
        return null;
      }

      return {
        ...currentAnalysis,

        items:
          currentAnalysis.items.map(
            (item) => {
              if (
                item.id !==
                currentItem.id
              ) {
                return item;
              }

              return {
                ...item,

                suggestedProductId:
                  result.productId,

                suggestedPresentationId:
                  result.presentationId,

                suggestedProductName:
                  result.productName,

                suggestedProduct: {
                  id:
                    result.productId,

                  name:
                    result.productName,

                  productName:
                    result.productName,

                  presentationName:
                    result.presentationName,
                },

                matchSource:
                  "manual",

                confidence:
                  100,

                status:
                  "confirmed",
              };
            },
          ),
      };
    },
  );

  setCreatingNewProductItem(
    null,
  );

  toast.success(
    `🧠 ${result.productName} fue creado y Listik lo aprendió.`,
  );
}

  function handleCloseProductSearch() {
    setSearchItem(
      null,
    );
  }

  /*
   * ==========================================
   * PRODUCTO ELEGIDO MANUALMENTE
   * ==========================================
   */

  function handleSelectCatalogProduct(
    selection: {
      product: {
        id: string;
        name: string;
      };

      presentation: {
        id: string;
        presentationName: string;
      } | null;
    },
  ) {
    if (
      !analysis ||
      !searchItem
    ) {
      return;
    }

    const currentItemId =
      searchItem.id;

    setAnalysis(
      (
        currentAnalysis,
      ) => {
        if (
          !currentAnalysis
        ) {
          return null;
        }

        return {
          ...currentAnalysis,

          items:
            currentAnalysis.items.map(
              (item) => {
                if (
                  item.id !==
                  currentItemId
                ) {
                  return item;
                }

                return {
                  ...item,

                  /*
                   * IDs explícitos
                   * que usaremos después
                   * para Brain y Prices.
                   */
                  suggestedProductId:
                    selection.product.id,

                  suggestedPresentationId:
                    selection.presentation
                      ?.id ??
                    undefined,

                  suggestedProductName:
                    selection.product.name,

                  /*
                   * Actualizamos también
                   * suggestedProduct para
                   * que TicketProductCard
                   * pueda mostrarlo.
                   */
                  suggestedProduct: {
                    id:
                      selection.product.id,

                    name:
                      selection.product.name,

                    productName:
                      selection.product.name,

                    presentationName:
                      selection.presentation
                        ?.presentationName,
                  },

                  /*
                   * Al elegir manualmente
                   * todavía falta confirmar.
                   */
                  status:
                    "pending",

                  /*
                   * Marcamos la fuente
                   * como manual.
                   */
                  matchSource:
                    "manual",

                  /*
                   * La selección fue humana.
                   * Mostramos confianza alta,
                   * pero NO confirmamos
                   * automáticamente.
                   */
                  confidence:
                    100,
                };
              },
            ),
        };
      },
    );

    setSearchItem(
      null,
    );

    toast.success(
      "Producto seleccionado. Ahora confirma la coincidencia.",
    );
  }

  /*
   * ==========================================
   * GUARDAR PRECIOS
   * ==========================================
   */

  async function handleSavePrices() {
    if (!analysis) {
      return;
    }

    if (pricesSaved) {
      toast(
        "Los precios de este ticket ya fueron guardados.",
      );

      return;
    }

    /*
     * No guardar si todavía
     * hay productos sin revisar.
     */
    if (
      pendingCount >
      0
    ) {
      toast.error(
        "Revisa todos los productos antes de guardar los precios.",
      );

      return;
    }

    if (
      confirmedItems.length ===
      0
    ) {
      toast.error(
        "No hay productos confirmados para guardar.",
      );

      return;
    }

    /*
     * Verificar productId.
     */
    const itemWithoutProductId =
      confirmedItems.find(
        (item) =>
          !getProductId(
            item,
          ),
      );

    if (
      itemWithoutProductId
    ) {
      console.error(
        "Producto confirmado sin productId:",
        itemWithoutProductId,
      );

      toast.error(
        `No podemos guardar "${itemWithoutProductId.rawName}" porque no tiene productId.`,
      );

      return;
    }

    /*
     * Crear payload.
     */
    const items =
      confirmedItems.map(
        (item) => {
          const productId =
            getProductId(
              item,
            );

          if (!productId) {
            throw new Error(
              `Falta productId para ${item.rawName}.`,
            );
          }

          return {
            productId,

            presentationId:
              getPresentationId(
                item,
              ),

            rawName:
              item.rawName,

            quantity:
              item.quantity,

            unitPrice:
              item.unitPrice,
          };
        },
      );

    try {
      setSavingPrices(
        true,
      );

      const result =
        await saveTicketPrices({
          storeName:
            analysis.store,

          branch:
            analysis.branch ??
            null,

          purchaseDate:
            analysis.purchaseDate ??
            analysis.date ??
            null,

          items,
        });

      setPricesSaved(
        true,
      );

      if (
        result.total ===
        0
      ) {
        toast.success(
          "🛡️ Este ticket ya estaba registrado. No se duplicaron precios.",
        );
      } else {
        toast.success(
          `💲 ${result.total} precio${
            result.total ===
            1
              ? ""
              : "s"
          } nuevo${
            result.total ===
            1
              ? ""
              : "s"
          } guardado${
            result.total ===
            1
              ? ""
              : "s"
          } en Listik.`,
        );
      }

      console.log(
        "💲 RESULTADO PRECIOS:",
        result,
      );
    } catch (error) {
      console.error(
        "Error guardando precios del ticket:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los precios.",
      );
    } finally {
      setSavingPrices(
        false,
      );
    }
  }

  /*
   * ==========================================
   * RENDER
   * ==========================================
   */

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}

        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-widest text-green-600">
            Listik Intelligence
          </p>

          <h1 className="mt-2 text-4xl font-black text-slate-900">
            Analizar ticket
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            Sube una imagen del ticket.
            Listik detectará los productos,
            buscará coincidencias y
            convertirá los artículos
            confirmados en precios reales
            para el comparador.
          </p>
        </div>

        {/* SUBIR TICKET */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* ARCHIVO */}

            <div>
              <label className="text-sm font-black text-slate-900">
                Imagen del ticket
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={
                  handleFileChange
                }
                className="mt-3 block w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm"
              />

              {file && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="font-bold text-slate-900">
                    {file.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {(
                      file.size /
                      1024 /
                      1024
                    ).toFixed(
                      2,
                    )}{" "}
                    MB
                  </p>
                </div>
              )}

              <button
                type="button"
                disabled={
                  !file ||
                  loading
                }
                onClick={
                  handleAnalyzeTicket
                }
                className="mt-5 w-full rounded-2xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Analizando..."
                  : "Analizar ticket"}
              </button>
            </div>

            {/* PREVIEW */}

            <div>
              {previewUrl ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <img
                    src={
                      previewUrl
                    }
                    alt="Vista previa del ticket"
                    className="max-h-80 w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <p className="text-sm font-semibold text-slate-400">
                    La vista previa del
                    ticket aparecerá aquí.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RESULTADOS */}

        {analysis && (
          <>
            {/* INFORMACIÓN */}

            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-green-600">
                Ticket detectado
              </p>

              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Tienda
                  </p>

                  <p className="mt-1 font-black text-slate-900">
                    {analysis.store}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Sucursal
                  </p>

                  <p className="mt-1 font-black text-slate-900">
                    {analysis.branch ??
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Fecha
                  </p>

                  <p className="mt-1 font-black text-slate-900">
                    {analysis.purchaseDate ??
                      analysis.date ??
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Total
                  </p>

                  <p className="mt-1 text-xl font-black text-slate-900">
                    $
                    {analysis.total.toLocaleString(
                      "es-MX",
                      {
                        minimumFractionDigits:
                          2,

                        maximumFractionDigits:
                          2,
                      },
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* VALIDACIÓN */}

            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-green-600">
                    Estado del ticket
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    Validación
                  </h2>
                </div>

                <p className="text-4xl font-black text-green-600">
                  {progress}%
                </p>
              </div>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-green-600 transition-all duration-500"
                  style={{
                    width:
                      `${progress}%`,
                  }}
                />
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-green-50 p-5">
                  <p className="text-sm font-bold text-green-700">
                    Confirmados
                  </p>

                  <p className="mt-2 text-3xl font-black text-green-700">
                    {confirmedCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 p-5">
                  <p className="text-sm font-bold text-amber-700">
                    Pendientes
                  </p>

                  <p className="mt-2 text-3xl font-black text-amber-700">
                    {pendingCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-50 p-5">
                  <p className="text-sm font-bold text-blue-700">
                    Productos nuevos
                  </p>

                  <p className="mt-2 text-3xl font-black text-blue-700">
                    {
                      newProductsCount
                    }
                  </p>
                </div>
              </div>

              {pendingCount >
              0 ? (
                <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                  <p className="font-bold text-amber-700">
                    Faltan{" "}
                    {pendingCount}{" "}
                    producto
                    {pendingCount ===
                    1
                      ? ""
                      : "s"}{" "}
                    por revisar.
                  </p>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 p-4">
                  <p className="font-bold text-green-700">
                    Ticket revisado
                    completamente.
                  </p>
                </div>
              )}
            </section>

            {/* PRODUCTOS */}

            <section className="mt-8">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-green-600">
                    Productos detectados
                  </p>

                  <h2 className="mt-2 text-3xl font-black text-slate-900">
                    Revisa las coincidencias
                  </h2>

                  <p className="mt-2 text-slate-500">
                    Confirma las sugerencias
                    del Brain o busca
                    manualmente el producto
                    correcto en el catálogo.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center shadow-sm">
                  <p className="text-xs font-black uppercase text-slate-400">
                    Revisados
                  </p>

                  <p className="font-black text-slate-900">
                    {reviewedCount}
                    {" / "}
                    {totalItems}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {analysis.items.map(
                  (item) => (
                    <TicketProductCard
                      key={
                        item.id
                      }
                      item={
                        item
                      }
                      onStatusChange={
                        handleStatusChange
                      }
                      onSearchProduct={
                        handleSearchProduct
                      }
                    />
                  ),
                )}
              </div>
            </section>

            {/* GUARDAR PRECIOS */}

            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-green-600">
                    Listik Prices
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    Guardar precios del ticket
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm text-slate-500">
                    Los productos confirmados
                    se guardarán como
                    observaciones reales de
                    precio para alimentar el
                    comparador.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                      {confirmedCount}{" "}
                      confirmados
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {analysis.store}
                    </span>

                    {analysis.branch && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {
                          analysis.branch
                        }
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={
                      handleSavePrices
                    }
                    disabled={
                      savingPrices ||
                      pricesSaved ||
                      pendingCount >
                        0 ||
                      confirmedCount ===
                        0
                    }
                    className="w-full rounded-2xl bg-green-600 px-6 py-4 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                  >
                    {savingPrices
                      ? "Guardando precios..."
                      : pricesSaved
                        ? "✓ Precios guardados"
                        : "💾 Guardar precios"}
                  </button>
                </div>
              </div>

              {pendingCount >
                0 && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-bold text-amber-700">
                    Revisa los{" "}
                    {pendingCount}{" "}
                    productos pendientes
                    antes de guardar los
                    precios.
                  </p>
                </div>
              )}

              {pricesSaved && (
                <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
                  <p className="font-black text-green-700">
                    ✓ Los precios
                    confirmados ya forman
                    parte de la base de
                    datos de Listik.
                  </p>
                </div>
              )}
            </section>
          </>
        )}

        {/* MODAL BUSCAR PRODUCTO */}

        <ProductSearchModal
  open={
    Boolean(
      searchItem,
    )
  }
  rawName={
    searchItem?.rawName ??
    ""
  }
  onClose={
    handleCloseProductSearch
  }
  onSelect={
    handleSelectCatalogProduct
  }
  onCreateNew={
    handleCreateNewProduct
  }
/>

<NewProductModal
  open={
    Boolean(
      creatingNewProductItem,
    )
  }
  learningId={
    creatingNewProductItem
      ?.learningId ??
    null
  }
  rawName={
    creatingNewProductItem
      ?.rawName ??
    ""
  }
  rawCode={
    creatingNewProductItem
      ?.rawCode ??
    null
  }
  storeName={
    analysis?.store ??
    null
  }
  onClose={
    handleCloseNewProduct
  }
  onCreated={
    handleProductCreated
  }
/>
      </div>
    </main>
  );
}