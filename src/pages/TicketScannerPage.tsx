import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import toast from "react-hot-toast";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import AppNav from "../components/AppNav";

import {
  supabase,
} from "../lib/supabase";

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
  createStoreBranch,
} from "../services/api/storeBranchApi";

import {
  saveBrainMemory,
} from "../services/brainMemoryService";

import {
  saveProductCode,
} from "../services/api/productCodeApi";

import type {
  TicketAnalysis,
  TicketItem,
  TicketItemStatus,
} from "../types/TicketAnalysis";


interface StoreOption {
  id: string;
  name: string;
}

interface BranchOption {
  id: string;
  store_id:
    | string
    | null;
  name: string;
  municipality:
    | string
    | null;
  state:
    | string
    | null;
}

function normalizeEntityName(
  value:
    | string
    | null
    | undefined,
) {
  return String(
    value ??
      "",
  )
    .toLocaleLowerCase(
      "es-MX",
    )
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .trim()
    .replace(
      /\s+/g,
      " ",
    );
}

export default function TicketScannerPage() {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] =
    useSearchParams();

  /*
   * Si venimos desde una compra terminada,
   * el tripId viaja en la URL.
   */

  const tripId =
    searchParams.get(
      "tripId",
    );

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
    useState<TicketAnalysis | null>(() => {
      try {
        const saved = sessionStorage.getItem(
          "listik_ticket_analysis",
        );

        if (!saved) {
          return null;
        }

        return JSON.parse(saved) as TicketAnalysis;
      } catch (error) {
        console.warn(
          "No se pudo recuperar el ticket guardado:",
          error,
        );
        return null;
      }
    });

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
   * CONFIRMACIÓN DE TIENDA / SUCURSAL
   * ==========================================
   */

  const [
    stores,
    setStores,
  ] =
    useState<
      StoreOption[]
    >([]);

  const [
    branches,
    setBranches,
  ] =
    useState<
      BranchOption[]
    >([]);

  const [
    selectedStoreId,
    setSelectedStoreId,
  ] =
    useState(
      "",
    );

  const [
    selectedBranchId,
    setSelectedBranchId,
  ] =
    useState(
      "",
    );


  const [
    creatingBranch,
    setCreatingBranch,
  ] =
    useState(
      false,
    );

  const [
    newBranchName,
    setNewBranchName,
  ] =
    useState(
      "",
    );

  const [
    newBranchMunicipality,
    setNewBranchMunicipality,
  ] =
    useState(
      "",
    );

  const [
    newBranchState,
    setNewBranchState,
  ] =
    useState(
      "",
    );

  const [
    newBranchLatitude,
    setNewBranchLatitude,
  ] =
    useState<
      number | null
    >(
      null,
    );

  const [
    newBranchLongitude,
    setNewBranchLongitude,
  ] =
    useState<
      number | null
    >(
      null,
    );

  const [
    savingBranch,
    setSavingBranch,
  ] =
    useState(
      false,
    );

  const [
    locatingBranch,
    setLocatingBranch,
  ] =
    useState(
      false,
    );

  const [
    loadingStores,
    setLoadingStores,
  ] =
    useState(
      false,
    );

  const [
    loadingBranches,
    setLoadingBranches,
  ] =
    useState(
      false,
    );

  const selectedStore =
    useMemo(
      () =>
        stores.find(
          (
            store,
          ) =>
            store.id ===
            selectedStoreId,
        ) ??
        null,
      [
        stores,
        selectedStoreId,
      ],
    );

  const selectedBranch =
    useMemo(
      () =>
        branches.find(
          (
            branch,
          ) =>
            branch.id ===
            selectedBranchId,
        ) ??
        null,
      [
        branches,
        selectedBranchId,
      ],
    );

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
   * CARGAR TIENDAS EXISTENTES
   * ==========================================
   */

  useEffect(
    () => {
      let cancelled =
        false;

      async function loadStores() {
        try {
          setLoadingStores(
            true,
          );

          const {
            data,
            error,
          } =
            await supabase
              .from(
                "stores",
              )
              .select(`
                id,
                name
              `)
              .order(
                "name",
                {
                  ascending:
                    true,
                },
              );

          if (
            error
          ) {
            throw error;
          }

          if (
            cancelled
          ) {
            return;
          }

          setStores(
            (
              data ??
              []
            ).map(
              (
                row,
              ) => ({
                id:
                  String(
                    row.id,
                  ),

                name:
                  String(
                    row.name ??
                      "Tienda",
                  ),
              }),
            ),
          );
        } catch (
          storeError
        ) {
          console.error(
            "Error cargando tiendas:",
            storeError,
          );

          if (
            !cancelled
          ) {
            toast.error(
              "No se pudieron cargar las tiendas para confirmar el ticket.",
            );
          }
        } finally {
          if (
            !cancelled
          ) {
            setLoadingStores(
              false,
            );
          }
        }
      }

      void loadStores();

      return () => {
        cancelled =
          true;
      };
    },
    [],
  );

  /*
   * ==========================================
   * CARGAR SUCURSALES DE LA TIENDA
   * ==========================================
   */

  useEffect(
    () => {
      if (
        !selectedStoreId
      ) {
        setBranches(
          [],
        );

        setSelectedBranchId(
          "",
        );

        return;
      }

      let cancelled =
        false;

      async function loadBranches() {
        try {
          setLoadingBranches(
            true,
          );

          const {
            data,
            error,
          } =
            await supabase
              .from(
                "store_branches",
              )
              .select(`
                id,
                store_id,
                name,
                municipality,
                state
              `)
              .eq(
                "store_id",
                selectedStoreId,
              )
              .order(
                "name",
                {
                  ascending:
                    true,
                },
              );

          if (
            error
          ) {
            throw error;
          }

          if (
            cancelled
          ) {
            return;
          }

          const normalized =
            (
              data ??
              []
            ).map(
              (
                row,
              ) => ({
                id:
                  String(
                    row.id,
                  ),

                store_id:
                  row.store_id
                    ? String(
                        row.store_id,
                      )
                    : null,

                name:
                  String(
                    row.name ??
                      "Sucursal",
                  ),

                municipality:
                  row.municipality ??
                  null,

                state:
                  row.state ??
                  null,
              }),
            );

          setBranches(
            normalized,
          );

          /*
           * Si OCR detectó una sucursal,
           * intentamos preseleccionarla.
           */
          const branchText =
            normalizeEntityName(
              analysis?.branch,
            );

          if (
            branchText
          ) {
            const exact =
              normalized.find(
                (
                  branch,
                ) =>
                  normalizeEntityName(
                    branch.name,
                  ) ===
                  branchText,
              );

            const contains =
              exact ??
              normalized.find(
                (
                  branch,
                ) => {
                  const key =
                    normalizeEntityName(
                      branch.name,
                    );

                  return (
                    key.includes(
                      branchText,
                    ) ||
                    branchText.includes(
                      key,
                    )
                  );
                },
              );

            if (
              contains
            ) {
              setSelectedBranchId(
                contains.id,
              );
            }
          }
        } catch (
          branchError
        ) {
          console.error(
            "Error cargando sucursales:",
            branchError,
          );

          if (
            !cancelled
          ) {
            toast.error(
              "No se pudieron cargar las sucursales de esta tienda.",
            );
          }
        } finally {
          if (
            !cancelled
          ) {
            setLoadingBranches(
              false,
            );
          }
        }
      }

      void loadBranches();

      return () => {
        cancelled =
          true;
      };
    },
    [
      selectedStoreId,
      analysis?.branch,
    ],
  );

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
   * PERSISTIR TICKET ENTRE RECARGAS
   * ==========================================
   */

  useEffect(() => {
    try {
      if (analysis) {
        sessionStorage.setItem(
          "listik_ticket_analysis",
          JSON.stringify(analysis),
        );
      } else {
        sessionStorage.removeItem(
          "listik_ticket_analysis",
        );
      }
    } catch (error) {
      console.warn(
        "No se pudo guardar el ticket temporalmente:",
        error,
      );
    }
  }, [analysis]);

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

    setSelectedStoreId(
      "",
    );

    setSelectedBranchId(
      "",
    );

    setCreatingBranch(
      false,
    );

    setNewBranchName(
      "",
    );

    setNewBranchMunicipality(
      "",
    );

    setNewBranchState(
      "",
    );

    setNewBranchLatitude(
      null,
    );

    setNewBranchLongitude(
      null,
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

      const normalizedAnalysis:
        TicketAnalysis = {
        ...data.analysis,

        items:
          normalizedItems,
      };

      setAnalysis(
        normalizedAnalysis,
      );


      /*
       * ========================================
       * PRESELECCIONAR TIENDA DETECTADA
       * ========================================
       */

      const detectedStoreKey =
        normalizeEntityName(
          normalizedAnalysis.store,
        );

      if (
        detectedStoreKey
      ) {
        const exactStore =
          stores.find(
            (
              store,
            ) =>
              normalizeEntityName(
                store.name,
              ) ===
              detectedStoreKey,
          );

        const similarStore =
          exactStore ??
          stores.find(
            (
              store,
            ) => {
              const storeKey =
                normalizeEntityName(
                  store.name,
                );

              return (
                storeKey.includes(
                  detectedStoreKey,
                ) ||
                detectedStoreKey.includes(
                  storeKey,
                )
              );
            },
          );

        if (
          similarStore
        ) {
          setSelectedStoreId(
            similarStore.id,
          );
        } else {
          setSelectedStoreId(
            "",
          );
        }
      }

      setSelectedBranchId(
        "",
      );

      if (
        tripId
      ) {
        console.log(
          "🧾 Ticket listo para guardar en historial:",
          tripId,
        );
      }

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

    /*
     * ==========================================
     * APRENDER CÓDIGO DEL PRODUCTO
     * ==========================================
     */

    const normalizedRawCode =
      item.rawCode?.trim();

    if (
      normalizedRawCode &&
      /^\d{6,14}$/.test(
        normalizedRawCode,
      ) &&
      productId &&
      presentationId &&
      analysis.store
    ) {
      try {
        await saveProductCode({
          productId,

          presentationId,

          storeName:
            analysis.store,

          code:
            normalizedRawCode,
        });

        console.log(
          "🧠 Código aprendido:",
          {
            store:
              analysis.store,

            code:
              normalizedRawCode,

            productId,

            presentationId,
          },
        );
      } catch (error) {
        console.warn(
          "⚠️ No se pudo aprender el código:",
          {
            code:
              normalizedRawCode,

            error,
          },
        );
      }
    }
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
   * ACTUALIZAR VIAJE CON TOTAL DEL TICKET
   * ==========================================
   */

  /*
   * ==========================================
   * GUARDAR TICKET COMO HISTORIAL DE GASTO
   * ==========================================
   *
   * MVP:
   * Ya NO intentamos conciliar cada producto
   * contra shopping_trip_items.
   *
   * Guardamos únicamente:
   * - total real del ticket
   * - fecha de escaneo
   * - sucursal
   * - compra completada
   *
   * Así el historial mensual puede calcular
   * gastos reales sin depender del matching.
   */

  async function saveTripExpenseFromTicket(
    ticketAnalysis?: TicketAnalysis,
  ) {
    const sourceAnalysis =
      ticketAnalysis ??
      analysis;

    if (
      !tripId ||
      !sourceAnalysis
    ) {
      return;
    }

    const ticketTotal =
      Number(
        sourceAnalysis.total,
      );

    if (
      !Number.isFinite(
        ticketTotal,
      ) ||
      ticketTotal <
        0
    ) {
      throw new Error(
        "El ticket no contiene un total válido.",
      );
    }

    const now =
      new Date()
        .toISOString();

    const {
      error,
    } =
      await supabase
        .from(
          "shopping_trips",
        )
        .update({
          status:
            "completed",

          actual_total:
            ticketTotal,

          ticket_total:
            ticketTotal,

          ticket_scanned_at:
            now,

          completed_at:
            now,

          store_branch_id:
            selectedBranch?.id ??
            null,

          /*
           * Desactivamos la lógica financiera
           * anterior para este MVP.
           */
          savings_amount:
            null,

          ticket_list_total:
            null,

          ticket_outside_list_total:
            null,

          ticket_matched_items:
            null,

          ticket_matched_units:
            null,
        })
        .eq(
          "id",
          tripId,
        );

    if (
      error
    ) {
      throw error;
    }

    console.log(
      "🧾 GASTO GUARDADO EN HISTORIAL:",
      {
        tripId,

        ticketTotal,

        store:
          selectedStore?.name ??
          sourceAnalysis.store ??
          null,

        branch:
          selectedBranch?.name ??
          sourceAnalysis.branch ??
          null,

        scannedAt:
          now,
      },
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


    if (
      !selectedStore
    ) {
      toast.error(
        "Confirma la tienda antes de guardar los precios.",
      );

      return;
    }

    /*
     * Si el ticket detectó una sucursal o la tienda
     * tiene sucursales cargadas, exigimos elegir una.
     */
    if (
      branches.length >
        0 &&
      !selectedBranch
    ) {
      toast.error(
        "Confirma la sucursal antes de guardar los precios.",
      );

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
          storeId:
            selectedStore.id,

          storeBranchId:
            selectedBranch?.id ??
            null,

          storeName:
            selectedStore.name,

          branch:
            selectedBranch?.name ??
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

      /*
       * ========================================
       * CONCILIACIÓN DEFINITIVA DEL VIAJE
       * ========================================
       *
       * Llegamos aquí DESPUÉS de que el usuario
       * revisó todos los renglones del ticket.
       *
       * Siempre recalculamos con el estado actual
       * de `analysis`, porque ahí ya están las
       * coincidencias confirmadas manualmente.
       */

      if (
        tripId
      ) {
        await saveTripExpenseFromTicket(
          analysis,
        );

        toast.success(
          "🧾 Compra guardada en tu historial.",
        );
      }

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
   * REGISTRAR NUEVA SUCURSAL
   * ==========================================
   */

  function startCreateBranch() {
    if (
      !selectedStore
    ) {
      toast.error(
        "Primero confirma la tienda.",
      );

      return;
    }

    setNewBranchName(
      analysis?.branch
        ?.trim() ||
        `${selectedStore.name} - nueva sucursal`,
    );

    setNewBranchMunicipality(
      "",
    );

    setNewBranchState(
      "",
    );

    setNewBranchLatitude(
      null,
    );

    setNewBranchLongitude(
      null,
    );

    setCreatingBranch(
      true,
    );
  }

  function cancelCreateBranch() {
    setCreatingBranch(
      false,
    );

    setNewBranchName(
      "",
    );

    setNewBranchMunicipality(
      "",
    );

    setNewBranchState(
      "",
    );

    setNewBranchLatitude(
      null,
    );

    setNewBranchLongitude(
      null,
    );
  }

  function useCurrentLocationForBranch() {
    if (
      !navigator.geolocation
    ) {
      toast.error(
        "Tu navegador no permite obtener la ubicación.",
      );

      return;
    }

    setLocatingBranch(
      true,
    );

    navigator.geolocation.getCurrentPosition(
      (
        position,
      ) => {
        setNewBranchLatitude(
          position.coords.latitude,
        );

        setNewBranchLongitude(
          position.coords.longitude,
        );

        setLocatingBranch(
          false,
        );

        toast.success(
          "Ubicación capturada para la sucursal.",
        );
      },
      (
        locationError,
      ) => {
        console.error(
          "Error obteniendo ubicación de sucursal:",
          locationError,
        );

        setLocatingBranch(
          false,
        );

        toast.error(
          "No pudimos obtener tu ubicación. Revisa el permiso del navegador.",
        );
      },
      {
        enableHighAccuracy:
          false,

        timeout:
          10000,

        maximumAge:
          300000,
      },
    );
  }

  async function saveNewBranch() {
    if (
      !selectedStore
    ) {
      toast.error(
        "Primero confirma la tienda.",
      );

      return;
    }

    const name =
      newBranchName.trim();

    const municipality =
      newBranchMunicipality.trim();

    const state =
      newBranchState.trim();

    if (!name) {
      toast.error(
        "Escribe el nombre de la sucursal.",
      );

      return;
    }

    if (!municipality) {
      toast.error(
        "Escribe el municipio.",
      );

      return;
    }

    if (!state) {
      toast.error(
        "Escribe el estado.",
      );

      return;
    }

    if (
      newBranchLatitude === null ||
      newBranchLongitude === null
    ) {
      toast.error(
        "Usa tu ubicación para guardar las coordenadas de la sucursal.",
      );

      return;
    }

    try {
      setSavingBranch(
        true,
      );

      const result =
        await createStoreBranch({
          storeId:
            selectedStore.id,

          name,

          municipality,

          state,

          latitude:
            newBranchLatitude,

          longitude:
            newBranchLongitude,
        });

      const created: BranchOption = {
        id:
          result.data.id,

        store_id:
          result.data.storeId,

        name:
          result.data.name,

        municipality:
          result.data.municipality,

        state:
          result.data.state,
      };

      setBranches(
        (current) => [
          ...current.filter(
            (branch) =>
              branch.id !==
              created.id,
          ),
          created,
        ].sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
              "es-MX",
            ),
        ),
      );

      setSelectedBranchId(
        created.id,
      );

      setCreatingBranch(
        false,
      );

      setPricesSaved(
        false,
      );

      toast.success(
        result.data.created
          ? `Sucursal "${created.name}" registrada.`
          : `Sucursal "${created.name}" seleccionada.`,
      );
    } catch (branchError) {
      console.error(
        "Error creando sucursal:",
        branchError,
      );

      toast.error(
        branchError instanceof Error
          ? branchError.message
          : "No se pudo registrar la sucursal.",
      );
    } finally {
      setSavingBranch(
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
    <main className="min-h-screen bg-slate-50">
      <AppNav />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* ======================================
            COMPRA VINCULADA
        ====================================== */}

        {tripId && (
          <div className="mb-6 rounded-3xl border border-green-200 bg-green-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-green-600">
                  Compra terminada
                </p>

                <p className="mt-1 font-black text-green-950">
                  🧾 Este ticket se vinculará con tu compra.
                </p>

                <p className="mt-1 text-sm text-green-700">
                  Listik guardará el total real del ticket para tu historial y tus reportes mensuales de gasto.
                </p>
              </div>

              <Link
                to={`/compra/resumen?tripId=${encodeURIComponent(tripId)}`}
                className="shrink-0 rounded-xl border border-green-300 bg-white px-4 py-3 text-center text-sm font-black text-green-700"
              >
                ← Volver al resumen
              </Link>
            </div>
          </div>
        )}

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
                    Tienda OCR
                  </p>

                  <p className="mt-1 font-black text-slate-900">
                    {analysis.store}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Sucursal OCR
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

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div
                  className={`rounded-2xl border p-5 ${
                    selectedStore
                      ? "border-green-200 bg-green-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-xs font-black uppercase tracking-widest ${
                          selectedStore
                            ? "text-green-700"
                            : "text-amber-700"
                        }`}
                      >
                        🏪 Confirmar tienda
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Elige la tienda real. El OCR no puede crear una tienda nueva.
                      </p>
                    </div>

                    <span className="text-xl">
                      {selectedStore
                        ? "✓"
                        : "⚠️"}
                    </span>
                  </div>

                  <select
                    value={
                      selectedStoreId
                    }
                    disabled={
                      loadingStores
                    }
                    onChange={
                      (
                        event,
                      ) => {
                        setSelectedStoreId(
                          event.target.value,
                        );

                        setSelectedBranchId(
                          "",
                        );

                        setPricesSaved(
                          false,
                        );
                      }
                    }
                    className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-green-400"
                  >
                    <option value="">
                      {loadingStores
                        ? "Cargando tiendas..."
                        : "Selecciona una tienda"}
                    </option>

                    {stores.map(
                      (
                        store,
                      ) => (
                        <option
                          key={
                            store.id
                          }
                          value={
                            store.id
                          }
                        >
                          {store.name}
                        </option>
                      ),
                    )}
                  </select>

                  {selectedStore && (
                    <p className="mt-3 text-sm font-black text-green-800">
                      ✓ {selectedStore.name}
                    </p>
                  )}
                </div>

                <div
                  className={`rounded-2xl border p-5 ${
                    selectedBranch
                      ? "border-green-200 bg-green-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-xs font-black uppercase tracking-widest ${
                          selectedBranch
                            ? "text-green-700"
                            : "text-amber-700"
                        }`}
                      >
                        📍 Confirmar sucursal
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Relacionaremos los precios con una sucursal real para poder usar distancia y ubicación.
                      </p>
                    </div>

                    <span className="text-xl">
                      {selectedBranch
                        ? "✓"
                        : "⚠️"}
                    </span>
                  </div>

                  <select
                    value={
                      selectedBranchId
                    }
                    disabled={
                      !selectedStoreId ||
                      loadingBranches
                    }
                    onChange={
                      (
                        event,
                      ) => {
                        setSelectedBranchId(
                          event.target.value,
                        );

                        setPricesSaved(
                          false,
                        );
                      }
                    }
                    className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-green-400 disabled:bg-slate-100"
                  >
                    <option value="">
                      {!selectedStoreId
                        ? "Primero confirma la tienda"
                        : loadingBranches
                          ? "Cargando sucursales..."
                          : branches.length ===
                              0
                            ? "No hay sucursales registradas"
                            : "Selecciona una sucursal"}
                    </option>

                    {branches.map(
                      (
                        branch,
                      ) => (
                        <option
                          key={
                            branch.id
                          }
                          value={
                            branch.id
                          }
                        >
                          {branch.name}
                          {branch.municipality
                            ? ` · ${branch.municipality}`
                            : ""}
                          {branch.state
                            ? `, ${branch.state}`
                            : ""}
                        </option>
                      ),
                    )}
                  </select>

                  {selectedBranch && (
                    <div className="mt-3">
                      <p className="text-sm font-black text-green-800">
                        ✓ {selectedBranch.name}
                      </p>

                      {(selectedBranch.municipality ||
                        selectedBranch.state) && (
                        <p className="mt-1 text-xs font-bold text-green-700">
                          {selectedBranch.municipality ??
                            ""}
                          {selectedBranch.municipality &&
                          selectedBranch.state
                            ? ", "
                            : ""}
                          {selectedBranch.state ??
                            ""}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedStore &&
                    !creatingBranch && (
                      <button
                        type="button"
                        onClick={
                          startCreateBranch
                        }
                        className="mt-4 w-full rounded-xl border border-green-300 bg-white px-4 py-3 text-sm font-black text-green-700 transition hover:bg-green-100"
                      >
                        + Registrar nueva sucursal
                      </button>
                    )}

                  {creatingBranch && (
                    <div className="mt-4 rounded-2xl border border-green-200 bg-white p-4">
                      <p className="text-sm font-black text-slate-900">
                        Nueva sucursal de {selectedStore?.name}
                      </p>

                      <label className="mt-4 block">
                        <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Nombre de sucursal
                        </span>

                        <input
                          type="text"
                          value={
                            newBranchName
                          }
                          onChange={
                            (
                              event,
                            ) =>
                              setNewBranchName(
                                event.target.value,
                              )
                          }
                          placeholder="Ej. Sam's Club Mérida Norte"
                          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-green-400"
                        />
                      </label>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Municipio
                          </span>

                          <input
                            type="text"
                            value={
                              newBranchMunicipality
                            }
                            onChange={
                              (
                                event,
                              ) =>
                                setNewBranchMunicipality(
                                  event.target.value,
                                )
                            }
                            placeholder="Mérida"
                            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-green-400"
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Estado
                          </span>

                          <input
                            type="text"
                            value={
                              newBranchState
                            }
                            onChange={
                              (
                                event,
                              ) =>
                                setNewBranchState(
                                  event.target.value,
                                )
                            }
                            placeholder="Yucatán"
                            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-green-400"
                          />
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={
                          useCurrentLocationForBranch
                        }
                        disabled={
                          locatingBranch
                        }
                        className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        {locatingBranch
                          ? "Obteniendo ubicación..."
                          : newBranchLatitude !==
                                null &&
                              newBranchLongitude !==
                                null
                            ? "✓ Ubicación capturada"
                            : "📍 Usar mi ubicación"}
                      </button>

                      {newBranchLatitude !==
                        null &&
                        newBranchLongitude !==
                          null && (
                          <p className="mt-2 text-center text-xs font-bold text-slate-500">
                            {newBranchLatitude.toFixed(
                              5,
                            )}
                            ,{" "}
                            {newBranchLongitude.toFixed(
                              5,
                            )}
                          </p>
                        )}

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={
                            cancelCreateBranch
                          }
                          disabled={
                            savingBranch
                          }
                          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                        >
                          Cancelar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void saveNewBranch()
                          }
                          disabled={
                            savingBranch
                          }
                          className="rounded-xl bg-green-600 px-4 py-3 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          {savingBranch
                            ? "Guardando..."
                            : "Guardar sucursal"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedStore &&
                branches.length >
                  0 &&
                !selectedBranch && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                    Confirma la sucursal para que estos precios queden vinculados correctamente.
                  </div>
                )}
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

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        selectedStore
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {selectedStore
                        ? `✓ ${selectedStore.name}`
                        : "⚠️ Tienda sin confirmar"}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        selectedBranch
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {selectedBranch
                        ? `✓ ${selectedBranch.name}`
                        : "⚠️ Sucursal sin confirmar"}
                    </span>
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
                        0 ||
                      !selectedStore ||
                      (
                        branches.length >
                          0 &&
                        !selectedBranch
                      )
                    }
                    className="w-full rounded-2xl bg-green-600 px-6 py-4 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                  >
                    {savingPrices
                      ? "Guardando precios..."
                      : pricesSaved
                        ? "✓ Precios guardados"
                        : "✓ Confirmar ticket y guardar precios"}
                  </button>
                </div>
              </div>


              {(!selectedStore ||
                (
                  branches.length >
                    0 &&
                  !selectedBranch
                )) && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-bold text-amber-700">
                    Confirma la tienda
                    {branches.length >
                      0
                      ? " y la sucursal"
                      : ""}{" "}
                    antes de guardar los precios.
                  </p>
                </div>
              )}

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

              {pricesSaved &&
                tripId &&(
                 
                <div className="mt-5 rounded-2xl border border-green-200 bg-white p-4">
                  <p className="font-black text-slate-900">
                    ✅ Compra actualizada con el ticket
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    El total del ticket ya quedó guardado en tu historial de gastos.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/compra/resumen?tripId=${encodeURIComponent(tripId)}`,
                      )
                    }
                    className="mt-4 rounded-xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700"
                  >
                    Ver resumen de compra
                  </button>
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