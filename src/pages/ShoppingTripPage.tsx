import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../contexts/AuthContext";

import {
  useShoppingList,
} from "../hooks/useShoppingList";

import {
  supabase,
} from "../lib/supabase";

import AppNav from "../components/AppNav";

/*
 * ==========================================
 * ITEM DEL VIAJE
 * ==========================================
 */

interface TripItem {
  id: string;

  tripId: string;

  productId: string;

  presentationId:
    | string
    | null;

  quantity: number;

  checked: boolean;

  expectedPrice:
    | number
    | null;

  actualPrice:
    | number
    | null;
}

/*
 * ==========================================
 * SUCURSAL
 * ==========================================
 */

interface ShoppingBranch {
  id: string;

  storeId: string;

  storeName: string;

  branchName: string;

  address:
    | string
    | null;

  municipality:
    | string
    | null;

  state:
    | string
    | null;
}

/*
 * ==========================================
 * FILAS CRUDAS
 * ==========================================
 */

interface RawTripItem {
  id: string;

  trip_id: string;

  product_id: string;

  presentation_id:
    | string
    | null;

  quantity: number;

  checked: boolean;

  expected_price:
    | number
    | string
    | null;

  actual_price:
    | number
    | string
    | null;
}

interface RawBranch {
  id: string;

  store_id: string;

  name: string;

  address:
    | string
    | null;

  municipality:
    | string
    | null;

  state:
    | string
    | null;
}

interface RawStore {
  id: string;

  name: string;
}

interface BranchIdRow {
  id: string;
}

/*
 * ==========================================
 * TIENDA ELEGIDA DESDE EL RANKING
 * ==========================================
 */

interface SelectedStoreSelection {
  storeId: string;

  storeBranchId: string;

  storeName: string;

  branch:
    | string
    | null;

  expectedTotal: number;
}

interface SmartPlanAssignment {
  itemKey: string;
  productId: string;
  presentationId:
    | string
    | null;
  productName: string;
  presentationName:
    | string
    | null;
  quantity: number;
  branchId: string;
  storeId: string;
  storeName: string;
  branchName: string;
  unitPrice: number;
  lineTotal: number;
}

interface SmartPlanStore {
  branchId: string;
  storeId: string;
  storeName: string;
  branchName: string;
  latitude: number;
  longitude: number;
  distanceFromUserKm: number;
}

interface StoredSmartPurchasePlan {
  version: number;
  createdAt: string;
  productsTotal: number;
  travelCost: number;
  travelDistanceKm: number;
  estimatedTotal: number;
  stores: SmartPlanStore[];
  assignments: SmartPlanAssignment[];
}

/*
 * ==========================================
 * NORMALIZAR ITEM
 * ==========================================
 */

function normalizeTripItem(
  row: RawTripItem,
): TripItem {
  return {
    id:
      String(
        row.id,
      ),

    tripId:
      String(
        row.trip_id,
      ),

    productId:
      String(
        row.product_id,
      ),

    presentationId:
      row.presentation_id
        ? String(
            row.presentation_id,
          )
        : null,

    quantity:
      Number(
        row.quantity,
      ),

    checked:
      Boolean(
        row.checked,
      ),

    expectedPrice:
      row.expected_price ===
      null
        ? null
        : Number(
            row.expected_price,
          ),

    actualPrice:
      row.actual_price ===
      null
        ? null
        : Number(
            row.actual_price,
          ),
  };
}

/*
 * ==========================================
 * COMPONENTE
 * ==========================================
 */

export default function ShoppingTripPage() {
  const navigate =
    useNavigate();

  /*
   * ========================================
   * AUTH + UBICACIÓN
   * ========================================
   */

  const {
    user,
    profile,

    loading:
      authLoading,

    profileLoading,
  } =
    useAuth();

  const state =
    profile?.state
      ?.trim() ??
    "";

  const municipality =
    profile
      ?.municipality
      ?.trim() ??
    "";

  /*
   * ========================================
   * LISTA HABITUAL
   * ========================================
   */

  const {
    items,

    listId,

    loadingPersistentList,
  } =
    useShoppingList();

  /*
   * ========================================
   * TIENDA ELEGIDA DESDE /lista
   * ========================================
   */

  const selectedStoreFromRanking =
    useMemo<
      SelectedStoreSelection | null
    >(
      () => {
        try {
          const raw =
            sessionStorage.getItem(
              "listik_selected_store",
            );

          if (
            !raw
          ) {
            return null;
          }

          const parsed =
            JSON.parse(
              raw,
            ) as Partial<SelectedStoreSelection>;

          if (
            !parsed.storeId ||
            !parsed.storeBranchId ||
            !parsed.storeName
          ) {
            return null;
          }

          return {
            storeId:
              String(
                parsed.storeId,
              ),

            storeBranchId:
              String(
                parsed.storeBranchId,
              ),

            storeName:
              String(
                parsed.storeName,
              ),

            branch:
              parsed.branch ??
              null,

            expectedTotal:
              Number(
                parsed.expectedTotal ??
                0,
              ),
          };
        } catch (
          storageError
        ) {
          console.error(
            "❌ No se pudo leer la tienda elegida:",
            storageError,
          );

          return null;
        }
      },
      [],
    );


  const smartPurchasePlan =
    useMemo<
      StoredSmartPurchasePlan | null
    >(
      () => {
        try {
          const raw =
            sessionStorage.getItem(
              "listik_smart_purchase_plan",
            );

          if (
            !raw
          ) {
            return null;
          }

          const parsed =
            JSON.parse(
              raw,
            ) as Partial<StoredSmartPurchasePlan>;

          if (
            !Array.isArray(
              parsed.stores,
            ) ||
            parsed.stores.length === 0 ||
            !Array.isArray(
              parsed.assignments,
            )
          ) {
            return null;
          }

          return parsed as StoredSmartPurchasePlan;
        } catch (
          planError
        ) {
          console.error(
            "❌ No se pudo leer el plan inteligente:",
            planError,
          );

          return null;
        }
      },
      [],
    );

  const [
    currentStopIndex,
    setCurrentStopIndex,
  ] =
    useState(
      0,
    );

  const currentSmartStop =
    smartPurchasePlan
      ?.stores[
        currentStopIndex
      ] ??
    null;

  const smartAssignmentByKey =
    useMemo(
      () =>
        new Map(
          (
            smartPurchasePlan
              ?.assignments ??
            []
          ).map(
            (
              assignment,
            ) => [
              assignment.itemKey,
              assignment,
            ],
          ),
        ),
      [
        smartPurchasePlan,
      ],
    );

  /*
   * ========================================
   * CONTROL DE INICIALIZACIÓN
   * ========================================
   *
   * Evita volver a reconstruir el viaje
   * cuando cambian precios, items o
   * estados internos de React.
   */

  const initializedTripRef =
    useRef<
      string | null
    >(
      null,
    );

  /*
   * ========================================
   * VIAJE
   * ========================================
   */

  const [
    tripId,
    setTripId,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    tripItems,
    setTripItems,
  ] =
    useState<
      TripItem[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    finishing,
    setFinishing,
  ] =
    useState(
      false,
    );

  /*
   * ========================================
   * SUCURSALES
   * ========================================
   */

  const [
    branches,
    setBranches,
  ] =
    useState<
      ShoppingBranch[]
    >([]);

  const [
    loadingBranches,
    setLoadingBranches,
  ] =
    useState(
      true,
    );

  const [
    selectedBranchId,
    setSelectedBranchId,
  ] =
    useState(
      "",
    );

  const [
    savingBranch,
    setSavingBranch,
  ] =
    useState(
      false,
    );

  const [
    branchMessage,
    setBranchMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );

  /*
   * ========================================
   * REPORTAR PRECIO
   * ========================================
   */

  const [
    reportingItemId,
    setReportingItemId,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    reportedPrice,
    setReportedPrice,
  ] =
    useState(
      "",
    );

  const [
    savingReport,
    setSavingReport,
  ] =
    useState(
      false,
    );

  const [
    reportMessage,
    setReportMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );

  /*
   * ========================================
   * CLAVE PRODUCTO + PRESENTACIÓN
   * ========================================
   */

  const getItemKey =
    useCallback(
      (
        productId: string,
        presentationId:
          | string
          | null,
      ) =>
        `${productId}::${presentationId ?? "no-presentation"}`,
      [],
    );

  /*
   * ========================================
   * PRECIO ESPERADO POR SUCURSAL
   * ========================================
   */

  const getExpectedPrice =
    useCallback(
      (
        prices: {
          price: number;

          storeBranchId:
            | string
            | null;
        }[],

        storeBranchId:
          | string
          | null,
      ) => {
        /*
         * Si tenemos una sucursal elegida,
         * solamente aceptamos precios de esa
         * sucursal exacta.
         */

        const branchPrices =
          storeBranchId
            ? prices.filter(
                (
                  item,
                ) =>
                  item.storeBranchId ===
                  storeBranchId,
              )
            : prices;

        const validPrices =
          branchPrices
            .map(
              (
                item,
              ) =>
                Number(
                  item.price,
                ),
            )
            .filter(
              (
                price,
              ) =>
                Number.isFinite(
                  price,
                ) &&
                price >
                  0,
            );

        if (
          validPrices.length ===
          0
        ) {
          return null;
        }

        return Math.min(
          ...validPrices,
        );
      },
      [],
    );

  /*
   * ========================================
   * CARGAR SUCURSALES DE LA ZONA
   * ========================================
   */

  useEffect(
    () => {
      if (
        authLoading ||
        profileLoading
      ) {
        return;
      }

      if (
        !state ||
        !municipality
      ) {
        setBranches(
          [],
        );

        setLoadingBranches(
          false,
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

          /*
           * ==================================
           * IDS LOCALES
           * ==================================
           */

          const {
            data:
              branchIdData,

            error:
              branchIdError,
          } =
            await supabase.rpc(
              "get_branch_ids_by_location",
              {
                p_state:
                  state,

                p_municipality:
                  municipality,
              },
            );

          if (
            branchIdError
          ) {
            throw branchIdError;
          }

         const branchIds =
  (
    (
      branchIdData ??
      []
    ) as BranchIdRow[]
  )
    .map(
      (
        row,
      ) =>
        String(
          row.id ??
          "",
        ),
    )
    .filter(
      Boolean,
    );

          if (
            branchIds.length ===
            0
          ) {
            if (
              !cancelled
            ) {
              setBranches(
                [],
              );
            }

            return;
          }

          /*
           * ==================================
           * DATOS DE SUCURSALES
           * ==================================
           */

          const {
            data:
              branchData,

            error:
              branchError,
          } =
            await supabase
              .from(
                "store_branches",
              )
              .select(`
                id,
                store_id,
                name,
                address,
                municipality,
                state
              `)
              .in(
                "id",
                branchIds,
              );

          if (
            branchError
          ) {
            throw branchError;
          }

          const rawBranches =
            (
              branchData ??
              []
            ) as RawBranch[];

          /*
           * ==================================
           * CADENAS COMERCIALES
           * ==================================
           */

          const storeIds =
            Array.from(
              new Set(
                rawBranches
                  .map(
                    (
                      branch,
                    ) =>
                      branch.store_id,
                  )
                  .filter(
                    Boolean,
                  ),
              ),
            );

          let rawStores:
            RawStore[] =
            [];

          if (
            storeIds.length >
            0
          ) {
            const {
              data:
                storeData,

              error:
                storeError,
            } =
              await supabase
                .from(
                  "stores",
                )
                .select(`
                  id,
                  name
                `)
                .in(
                  "id",
                  storeIds,
                );

            if (
              storeError
            ) {
              throw storeError;
            }

            rawStores =
              (
                storeData ??
                []
              ) as RawStore[];
          }

          const storeById =
            new Map<
              string,
              string
            >();

          for (
            const store
            of rawStores
          ) {
            storeById.set(
              String(
                store.id,
              ),

              String(
                store.name,
              ),
            );
          }

          /*
           * ==================================
           * NORMALIZAR
           * ==================================
           */

          const normalizedBranches =
            rawBranches
              .map(
                (
                  branch,
                ): ShoppingBranch => ({
                  id:
                    String(
                      branch.id,
                    ),

                  storeId:
                    String(
                      branch.store_id,
                    ),

                  storeName:
                    storeById.get(
                      String(
                        branch.store_id,
                      ),
                    ) ??
                    "Tienda",

                  branchName:
                    branch.name,

                  address:
                    branch.address ??
                    null,

                  municipality:
                    branch.municipality ??
                    null,

                  state:
                    branch.state ??
                    null,
                }),
              )
              .sort(
                (
                  a,
                  b,
                ) => {
                  const storeComparison =
                    a.storeName.localeCompare(
                      b.storeName,
                      "es",
                    );

                  if (
                    storeComparison !==
                    0
                  ) {
                    return storeComparison;
                  }

                  return a.branchName.localeCompare(
                    b.branchName,
                    "es",
                  );
                },
              );

          if (
            cancelled
          ) {
            return;
          }

          setBranches(
            normalizedBranches,
          );

          console.log(
            "🏪 SUCURSALES PARA COMPRA:",
            {
              zone:
                `${municipality}, ${state}`,

              total:
                normalizedBranches.length,
            },
          );
        } catch (
          branchError
        ) {
          console.error(
            "❌ Error cargando sucursales:",
            branchError,
          );

          if (
            !cancelled
          ) {
            setBranches(
              [],
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
      authLoading,
      profileLoading,
      state,
      municipality,
    ],
  );

  /*
   * ========================================
   * CREAR / RECUPERAR COMPRA
   * ========================================
   */

  const initializeTrip =
    useCallback(
      async () => {
        if (
          !user ||
          !listId
        ) {
          return;
        }

        try {
          setLoading(
            true,
          );

          setError(
            null,
          );

          /*
           * ==================================
           * VIAJE ACTIVO
           * ==================================
           */

          const {
            data:
              activeTrip,

            error:
              activeTripError,
          } =
            await supabase
              .from(
                "shopping_trips",
              )
              .select(`
                id,
                user_id,
                list_id,
                status,
                store_branch_id,
                expected_total,
                started_at
              `)
              .eq(
                "user_id",
                user.id,
              )
              .eq(
                "list_id",
                listId,
              )
              .eq(
                "status",
                "active",
              )
              .order(
                "started_at",
                {
                  ascending:
                    false,
                },
              )
              .limit(
                1,
              )
              .maybeSingle();

          if (
            activeTripError
          ) {
            throw activeTripError;
          }

          /*
           * ==================================
           * SUCURSAL OBJETIVO
           * ==================================
           *
           * Prioridad:
           *
           * 1. La elegida en el ranking.
           * 2. La que ya tenía el viaje.
           */

          const targetBranchId =
            currentSmartStop
              ?.branchId ??
            selectedStoreFromRanking
              ?.storeBranchId ??
            (
              activeTrip
                ?.store_branch_id
                ? String(
                    activeTrip.store_branch_id,
                  )
                : null
            );

          /*
           * ==================================
           * CREAR / REUTILIZAR VIAJE
           * ==================================
           */

          let currentTripId:
            string;

          if (
            activeTrip
          ) {
            currentTripId =
              String(
                activeTrip.id,
              );

            /*
             * Si el usuario eligió una tienda
             * desde el ranking, actualizamos
             * inmediatamente el viaje activo.
             */

            if (
              selectedStoreFromRanking ||
              smartPurchasePlan
            ) {
              const {
                error:
                  updateTripStoreError,
              } =
                await supabase
                  .from(
                    "shopping_trips",
                  )
                  .update({
                    store_branch_id:
                      targetBranchId,

                    expected_total:
                      smartPurchasePlan
                        ?.productsTotal ??
                      selectedStoreFromRanking
                        ?.expectedTotal ??
                      null,
                  })
                  .eq(
                    "id",
                    currentTripId,
                  );

              if (
                updateTripStoreError
              ) {
                throw updateTripStoreError;
              }
            }
          } else {
            const {
              data:
                createdTrip,

              error:
                createTripError,
            } =
              await supabase
                .from(
                  "shopping_trips",
                )
                .insert({
                  user_id:
                    user.id,

                  list_id:
                    listId,

                  status:
                    "active",

                  store_branch_id:
                    targetBranchId,

                  expected_total:
                    smartPurchasePlan
                      ?.productsTotal ??
                    selectedStoreFromRanking
                      ?.expectedTotal ??
                    null,
                })
                .select(`
                  id,
                  store_branch_id
                `)
                .single();

            if (
              createTripError
            ) {
              throw createTripError;
            }

            currentTripId =
              String(
                createdTrip.id,
              );
          }

          setTripId(
            currentTripId,
          );

          setSelectedBranchId(
            targetBranchId ??
            "",
          );

          /*
           * ==================================
           * ITEMS EXISTENTES
           * ==================================
           */

          const {
            data:
              existingData,

            error:
              existingError,
          } =
            await supabase
              .from(
                "shopping_trip_items",
              )
              .select(`
                id,
                trip_id,
                product_id,
                presentation_id,
                quantity,
                checked,
                expected_price,
                actual_price
              `)
              .eq(
                "trip_id",
                currentTripId,
              );

          if (
            existingError
          ) {
            throw existingError;
          }

          const existingItems =
            (
              (
                existingData ??
                []
              ) as RawTripItem[]
            ).map(
              (
                row,
              ) =>
                normalizeTripItem(
                  row,
                ),
            );

          /*
           * ==================================
           * SINCRONIZAR CON MI LISTA ACTUAL
           * ==================================
           *
           * Esto evita arrastrar productos de
           * viajes anteriores.
           */

          const currentItemKeys =
            new Set(
              items.map(
                (
                  item,
                ) =>
                  getItemKey(
                    item.product.id,
                    item.presentationId,
                  ),
              ),
            );

          const staleItemIds =
            existingItems
              .filter(
                (
                  item,
                ) =>
                  !currentItemKeys.has(
                    getItemKey(
                      item.productId,
                      item.presentationId,
                    ),
                  ),
              )
              .map(
                (
                  item,
                ) =>
                  item.id,
              );

          if (
            staleItemIds.length >
            0
          ) {
            const {
              error:
                deleteStaleError,
            } =
              await supabase
                .from(
                  "shopping_trip_items",
                )
                .delete()
                .in(
                  "id",
                  staleItemIds,
                );

            if (
              deleteStaleError
            ) {
              throw deleteStaleError;
            }
          }

          const existingByKey =
            new Map(
              existingItems.map(
                (
                  item,
                ) => [
                  getItemKey(
                    item.productId,
                    item.presentationId,
                  ),
                  item,
                ],
              ),
            );

          /*
           * ==================================
           * ACTUALIZAR ITEMS EXISTENTES
           * ==================================
           */

          for (
            const item
            of items
          ) {
            const key =
              getItemKey(
                item.product.id,
                item.presentationId,
              );

            const existing =
              existingByKey.get(
                key,
              );

            if (
              !existing
            ) {
              continue;
            }

            const assignment =
              smartAssignmentByKey.get(
                key,
              );

            const expectedPrice =
              assignment
                ? Number(
                    assignment.unitPrice,
                  )
                : getExpectedPrice(
                    item.prices,
                    targetBranchId,
                  );

            const {
              error:
                updateItemError,
            } =
              await supabase
                .from(
                  "shopping_trip_items",
                )
                .update({
                  quantity:
                    item.quantity,

                  expected_price:
                    expectedPrice,

                  updated_at:
                    new Date().toISOString(),
                })
                .eq(
                  "id",
                  existing.id,
                );

            if (
              updateItemError
            ) {
              throw updateItemError;
            }
          }

          /*
           * ==================================
           * INSERTAR ITEMS FALTANTES
           * ==================================
           */

          const itemsToInsert =
            items
              .filter(
                (
                  item,
                ) =>
                  !existingByKey.has(
                    getItemKey(
                      item.product.id,
                      item.presentationId,
                    ),
                  ),
              )
              .map(
                (
                  item,
                ) => {
                  const key =
                    getItemKey(
                      item.product.id,
                      item.presentationId,
                    );

                  const assignment =
                    smartAssignmentByKey.get(
                      key,
                    );

                  return {
                    trip_id:
                      currentTripId,

                    product_id:
                      item.product.id,

                    presentation_id:
                      item.presentationId,

                    quantity:
                      item.quantity,

                    checked:
                      false,

                    expected_price:
                      assignment
                        ? Number(
                            assignment.unitPrice,
                          )
                        : getExpectedPrice(
                            item.prices,
                            targetBranchId,
                          ),

                    actual_price:
                      null,
                  };
                },
              );

          if (
            itemsToInsert.length >
            0
          ) {
            const {
              error:
                insertError,
            } =
              await supabase
                .from(
                  "shopping_trip_items",
                )
                .insert(
                  itemsToInsert,
                );

            if (
              insertError
            ) {
              throw insertError;
            }
          }

          /*
           * ==================================
           * RECARGAR CHECKLIST
           * ==================================
           */

          const {
            data:
              finalData,

            error:
              finalError,
          } =
            await supabase
              .from(
                "shopping_trip_items",
              )
              .select(`
                id,
                trip_id,
                product_id,
                presentation_id,
                quantity,
                checked,
                expected_price,
                actual_price
              `)
              .eq(
                "trip_id",
                currentTripId,
              );

          if (
            finalError
          ) {
            throw finalError;
          }

          const normalized =
            (
              (
                finalData ??
                []
              ) as RawTripItem[]
            ).map(
              (
                row,
              ) =>
                normalizeTripItem(
                  row,
                ),
            );

          setTripItems(
            normalized,
          );

          console.log(
            "🛒 MODO COMPRA INICIALIZADO:",
            {
              tripId:
                currentTripId,

              products:
                normalized.length,

              storeBranchId:
                targetBranchId,

              selectedStore:
                selectedStoreFromRanking
                  ?.storeName ??
                null,
            },
          );
        } catch (
          tripError
        ) {
          initializedTripRef.current =
            null;

          console.error(
            "❌ Error cargando modo compra:",
            tripError,
          );

          setError(
            tripError instanceof Error
              ? tripError.message
              : "No se pudo iniciar la compra.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        user,
        listId,
        items,
        selectedStoreFromRanking,
        smartPurchasePlan,
        currentSmartStop,
        smartAssignmentByKey,
        getItemKey,
        getExpectedPrice,
      ],
    );


  /*
   * ========================================
   * INICIALIZAR SOLO UNA VEZ
   * ========================================
   */

  useEffect(
    () => {
      if (
        loadingPersistentList ||
        !user ||
        !listId
      ) {
        return;
      }

      /*
       * Ya inicializamos este listId.
       *
       * Aunque cambien items o precios,
       * NO volvemos a mostrar
       * "Preparando tu compra".
       */

      if (
        initializedTripRef.current ===
        listId
      ) {
        return;
      }

      /*
       * Lo marcamos ANTES de comenzar
       * para evitar llamadas duplicadas.
       */

      initializedTripRef.current =
        listId;

      void initializeTrip();
    },
    [
      loadingPersistentList,
      user,
      listId,
      initializeTrip,
    ],
  );


  useEffect(
    () => {
      if (
        currentSmartStop
      ) {
        setSelectedBranchId(
          currentSmartStop.branchId,
        );

        setBranchMessage(
          null,
        );

        setReportingItemId(
          null,
        );

        setReportedPrice(
          "",
        );
      }
    },
    [
      currentSmartStop,
    ],
  );

  /*
   * ========================================
   * SUCURSAL SELECCIONADA
   * ========================================
   */

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
   * ========================================
   * GUARDAR SUCURSAL
   * ========================================
   */

  async function saveSelectedBranch() {
    if (
      !tripId
    ) {
      return;
    }

    if (
      !selectedBranchId
    ) {
      setBranchMessage(
        "Selecciona una sucursal.",
      );

      return;
    }

    try {
      setSavingBranch(
        true,
      );

      setBranchMessage(
        null,
      );

      /*
       * ==================================
       * RECALCULAR PRECIOS ESPERADOS
       * ==================================
       */

      const expectedByKey =
        new Map<
          string,
          number | null
        >();

      let nextExpectedTotal =
        0;

      for (
        const item
        of items
      ) {
        const expectedPrice =
          getExpectedPrice(
            item.prices,
            selectedBranchId,
          );

        expectedByKey.set(
          getItemKey(
            item.product.id,
            item.presentationId,
          ),
          expectedPrice,
        );

        if (
          expectedPrice !==
          null
        ) {
          nextExpectedTotal +=
            expectedPrice *
            item.quantity;
        }
      }

      /*
       * ==================================
       * GUARDAR SUCURSAL EN EL VIAJE
       * ==================================
       */

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "shopping_trips",
          )
          .update({
            store_branch_id:
              selectedBranchId,

            expected_total:
              Number(
                nextExpectedTotal.toFixed(
                  2,
                ),
              ),
          })
          .eq(
            "id",
            tripId,
          );

      if (
        updateError
      ) {
        throw updateError;
      }

      /*
       * ==================================
       * ACTUALIZAR ITEMS DEL VIAJE
       * ==================================
       */

      for (
        const tripItem
        of tripItems
      ) {
        const key =
          getItemKey(
            tripItem.productId,
            tripItem.presentationId,
          );

        const expectedPrice =
          expectedByKey.get(
            key,
          ) ??
          null;

        const {
          error:
            itemUpdateError,
        } =
          await supabase
            .from(
              "shopping_trip_items",
            )
            .update({
              expected_price:
                expectedPrice,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              tripItem.id,
            );

        if (
          itemUpdateError
        ) {
          throw itemUpdateError;
        }
      }

      /*
       * UI inmediata.
       */

      setTripItems(
        (
          current,
        ) =>
          current.map(
            (
              tripItem,
            ) => {
              const key =
                getItemKey(
                  tripItem.productId,
                  tripItem.presentationId,
                );

              return {
                ...tripItem,

                expectedPrice:
                  expectedByKey.get(
                    key,
                  ) ??
                  null,
              };
            },
          ),
      );

      /*
       * Guardamos la selección para futuras
       * recargas del modo compra.
       */

      const branch =
        branches.find(
          (
            item,
          ) =>
            item.id ===
            selectedBranchId,
        ) ??
        null;

      if (
        branch
      ) {
        sessionStorage.setItem(
          "listik_selected_store",
          JSON.stringify({
            storeId:
              branch.storeId,

            storeBranchId:
              branch.id,

            storeName:
              branch.storeName,

            branch:
              branch.branchName,

            expectedTotal:
              Number(
                nextExpectedTotal.toFixed(
                  2,
                ),
              ),
          }),
        );
      }

      setBranchMessage(
        "✓ Sucursal y precios actualizados",
      );

      window.setTimeout(
        () => {
          setBranchMessage(
            null,
          );
        },
        1800,
      );
    } catch (
      branchError
    ) {
      console.error(
        "❌ No se pudo guardar la sucursal:",
        branchError,
      );

      setBranchMessage(
        branchError instanceof Error
          ? branchError.message
          : "No se pudo guardar la sucursal.",
      );
    } finally {
      setSavingBranch(
        false,
      );
    }
  }


  /*
   * ========================================
   * MAPA DE PRODUCTOS
   * ========================================
   */

  const shoppingItemByKey =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            (typeof items)[number]
          >();

        for (
          const item
          of items
        ) {
          map.set(
            getItemKey(
              item.product.id,
              item.presentationId,
            ),
            item,
          );
        }

        return map;
      },
      [
        items,
        getItemKey,
      ],
    );

  /*
   * ========================================
   * CHECKLIST
   * ========================================
   */

  async function toggleChecked(
    item: TripItem,
  ) {
    const nextChecked =
      !item.checked;

    /*
     * UI optimista.
     *
     * Cambia inmediatamente sin
     * recargar el viaje.
     */

    setTripItems(
      (
        current,
      ) =>
        current.map(
          (
            currentItem,
          ) =>
            currentItem.id ===
            item.id
              ? {
                  ...currentItem,

                  checked:
                    nextChecked,
                }
              : currentItem,
        ),
    );

    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          "shopping_trip_items",
        )
        .update({
          checked:
            nextChecked,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          item.id,
        );

    if (
      updateError
    ) {
      /*
       * Si falla Supabase,
       * regresamos al estado anterior.
       */

      setTripItems(
        (
          current,
        ) =>
          current.map(
            (
              currentItem,
            ) =>
              currentItem.id ===
              item.id
                ? {
                    ...currentItem,

                    checked:
                      item.checked,
                  }
                : currentItem,
          ),
      );

      console.error(
        "❌ No se pudo actualizar checklist:",
        updateError,
      );
    }
  }

  /*
   * ========================================
   * REPORTAR PRECIO
   * ========================================
   */

  async function submitPriceReport(
    tripItem: TripItem,
  ) {
    if (
      !user
    ) {
      return;
    }

    /*
     * Necesitamos saber dónde
     * se observó el precio.
     */

    if (
      !selectedBranch
    ) {
      setReportMessage(
        "Primero selecciona la sucursal donde estás comprando.",
      );

      return;
    }

    const numericPrice =
      Number(
        reportedPrice,
      );

    if (
      !Number.isFinite(
        numericPrice,
      ) ||
      numericPrice <=
        0
    ) {
      setReportMessage(
        "Escribe un precio válido.",
      );

      return;
    }

    try {
      setSavingReport(
        true,
      );

      setReportMessage(
        null,
      );

      /*
       * ==================================
       * REPORTE COMUNITARIO
       * ==================================
       */

      const {
        error:
          reportError,
      } =
        await supabase
          .from(
            "price_reports",
          )
          .insert({
            user_id:
              user.id,

            product_id:
              tripItem.productId,

            presentation_id:
              tripItem.presentationId,

            store_id:
              selectedBranch.storeId,

            store_branch_id:
              selectedBranch.id,

            price:
              numericPrice,

            source:
              "community",

            verification_status:
              "pending",

            confidence_score:
              25,

            evidence_url:
              null,

            observed_at:
              new Date().toISOString(),
          });

      if (
        reportError
      ) {
        throw reportError;
      }

      /*
       * ==================================
       * PRECIO VISTO EN ESTA COMPRA
       * ==================================
       */

      const {
        error:
          tripItemError,
      } =
        await supabase
          .from(
            "shopping_trip_items",
          )
          .update({
            actual_price:
              numericPrice,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            tripItem.id,
          );

      if (
        tripItemError
      ) {
        throw tripItemError;
      }

      /*
       * ==================================
       * ACTUALIZAR SOLO LA TARJETA
       * ==================================
       *
       * No reconstruimos el viaje.
       * No aparece pantalla de carga.
       */

      setTripItems(
        (
          current,
        ) =>
          current.map(
            (
              item,
            ) =>
              item.id ===
              tripItem.id
                ? {
                    ...item,

                    actualPrice:
                      numericPrice,
                  }
                : item,
          ),
      );

      /*
       * Cerramos formulario.
       */

      setReportingItemId(
        null,
      );

      setReportedPrice(
        "",
      );

      setReportMessage(
        null,
      );

      console.log(
        "💲 PRECIO REPORTADO:",
        {
          productId:
            tripItem.productId,

          price:
            numericPrice,

          store:
            selectedBranch.storeName,

          branch:
            selectedBranch.branchName,
        },
      );
    } catch (
      reportError
    ) {
      console.error(
        "❌ No se pudo reportar el precio:",
        reportError,
      );

      setReportMessage(
        reportError instanceof Error
          ? reportError.message
          : "No pudimos guardar el precio.",
      );
    } finally {
      setSavingReport(
        false,
      );
    }
  }


  const visibleTripItems =
    useMemo(
      () => {
        if (
          !smartPurchasePlan ||
          !currentSmartStop
        ) {
          return tripItems;
        }

        return tripItems.filter(
          (
            tripItem,
          ) => {
            const key =
              getItemKey(
                tripItem.productId,
                tripItem.presentationId,
              );

            return (
              smartAssignmentByKey.get(
                key,
              )?.branchId ===
              currentSmartStop.branchId
            );
          },
        );
      },
      [
        tripItems,
        smartPurchasePlan,
        currentSmartStop,
        smartAssignmentByKey,
        getItemKey,
      ],
    );

  const currentStopCompletedCount =
    visibleTripItems.filter(
      (
        item,
      ) =>
        item.checked,
    ).length;

  const currentStopTotal =
    visibleTripItems.length;

  const currentStopPendingCount =
    Math.max(
      0,
      currentStopTotal -
        currentStopCompletedCount,
    );

  const isLastSmartStop =
    Boolean(
      smartPurchasePlan &&
      currentStopIndex ===
        smartPurchasePlan.stores.length -
          1,
    );

  function goToNextSmartStop() {
    if (
      !smartPurchasePlan ||
      isLastSmartStop
    ) {
      return;
    }

    setCurrentStopIndex(
      (
        current,
      ) =>
        Math.min(
          current + 1,
          smartPurchasePlan.stores.length - 1,
        ),
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
   * ========================================
   * PROGRESO
   * ========================================
   */

  const completedCount =
    tripItems.filter(
      (
        item,
      ) =>
        item.checked,
    ).length;

  const totalCount =
    tripItems.length;

  const pendingCount =
    Math.max(
      0,
      totalCount -
        completedCount,
    );

  const progress =
    totalCount >
    0
      ? Math.round(
          (
            completedCount /
            totalCount
          ) *
            100,
        )
      : 0;

  /*
   * ========================================
   * TOTAL
   * ========================================
   *
   * Si el usuario corrigió un precio,
   * usamos actualPrice.
   *
   * Si no, usamos expectedPrice.
   */

  const estimatedTotal =
    tripItems.reduce(
      (
        total,
        item,
      ) => {
        const price =
          item.actualPrice ??
          item.expectedPrice;

        if (
          price ===
          null
        ) {
          return total;
        }

        return (
          total +
          price *
            item.quantity
        );
      },
      0,
    );

  /*
   * ========================================
   * TERMINAR COMPRA
   * ========================================
   */

  async function finishTrip() {
    if (
      !tripId ||
      finishing
    ) {
      return;
    }

    /*
     * ========================================
     * TOTAL ESPERADO
     * ========================================
     *
     * Lo que Listik estimaba que costaría
     * la compra antes de las correcciones
     * de precio hechas por el usuario.
     */

    const expectedTotal =
      tripItems.reduce(
        (
          total,
          item,
        ) => {
          if (
            item.expectedPrice ===
            null
          ) {
            return total;
          }

          return (
            total +
            item.expectedPrice *
              item.quantity
          );
        },
        0,
      );

    /*
     * ========================================
     * TOTAL REAL
     * ========================================
     *
     * Si el usuario reportó el precio real,
     * usamos actualPrice.
     *
     * Si no hubo corrección, usamos el
     * precio esperado como mejor dato
     * disponible.
     */

    const actualTotal =
      tripItems.reduce(
        (
          total,
          item,
        ) => {
          const price =
            item.actualPrice ??
            item.expectedPrice;

          if (
            price ===
            null
          ) {
            return total;
          }

          return (
            total +
            price *
              item.quantity
          );
        },
        0,
      );

    /*
     * ========================================
     * AHORRO / SOBREPRESUPUESTO
     * ========================================
     *
     * Positivo = gastó menos.
     * Negativo = gastó más.
     */

    const savingsAmount =
      expectedTotal -
      actualTotal;

    const reportedPrices =
      tripItems.filter(
        (
          item,
        ) =>
          item.actualPrice !==
          null,
      ).length;

    try {
      setFinishing(
        true,
      );

      const {
        error:
          finishError,
      } =
        await supabase
          .from(
            "shopping_trips",
          )
          .update({
            status:
              "completed",

            completed_at:
              new Date().toISOString(),

            expected_total:
              expectedTotal,

            actual_total:
              actualTotal,

            savings_amount:
              savingsAmount,
          })
          .eq(
            "id",
            tripId,
          );

      if (
        finishError
      ) {
        throw finishError;
      }

      /*
       * Permitimos que si posteriormente
       * volvemos a entrar a modo compra,
       * se cree un viaje nuevo.
       */

      initializedTripRef.current =
        null;

      sessionStorage.removeItem(
        "listik_selected_store",
      );

      /*
       * ========================================
       * RESUMEN
       * ========================================
       */

      navigate(
        `/compra/resumen?tripId=${tripId}`,
        {
          state: {
            tripId,

            totalProducts:
              totalCount,

            completedProducts:
              completedCount,

            expectedTotal,

            actualTotal,

            savingsAmount,

            reportedPrices,

            storeName:
              smartPurchasePlan
                ? null
                : selectedBranch
                    ?.storeName ??
                  null,

            branchName:
              smartPurchasePlan
                ? null
                : selectedBranch
                    ?.branchName ??
                  null,

            smartPlan:
              smartPurchasePlan
                ? {
                    stores:
                      smartPurchasePlan.stores,

                    productsTotal:
                      smartPurchasePlan.productsTotal,

                    travelCost:
                      smartPurchasePlan.travelCost,

                    travelDistanceKm:
                      smartPurchasePlan.travelDistanceKm,

                    estimatedTotal:
                      smartPurchasePlan.estimatedTotal,
                  }
                : null,

},
        },
      );
    } catch (
      finishError
    ) {
      console.error(
        "❌ No se pudo terminar la compra:",
        finishError,
      );

      setError(
        finishError instanceof Error
          ? finishError.message
          : "No se pudo terminar la compra.",
      );
    } finally {
      setFinishing(
        false,
      );
    }
  }

  /*
   * ========================================
   * UI
   * ========================================
   */

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ======================================
          HEADER
      ====================================== */}

      <AppNav />

      {/* ======================================
          CONTENIDO
      ====================================== */}

      <section className="mx-auto max-w-3xl px-5 py-7">
        <p className="text-xs font-black uppercase tracking-widest text-green-600">
          Modo compra
        </p>

        <h1 className="mt-2 text-3xl font-black text-slate-900">
          Compra de hoy
        </h1>

        <p className="mt-2 text-slate-500">
          Marca los productos conforme los agregues al carrito.
        </p>

        {smartPurchasePlan ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-green-600">
              Plan inteligente activo
            </p>

            <p className="mt-2 font-black text-green-950">
              {smartPurchasePlan.stores.length} parada
              {smartPurchasePlan.stores.length === 1 ? "" : "s"} · $
              {smartPurchasePlan.productsTotal.toFixed(2)} en productos
            </p>

            <p className="mt-1 text-sm font-bold text-green-700">
              Recorrido aprox. {smartPurchasePlan.travelDistanceKm.toFixed(1)} km · traslado $
              {smartPurchasePlan.travelCost.toFixed(2)}
            </p>
          </div>
        ) : selectedStoreFromRanking ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-green-600">
              Opción elegida desde Mi lista
            </p>

            <p className="mt-2 font-black text-green-950">
              {selectedStoreFromRanking.storeName}
            </p>

            {selectedStoreFromRanking.branch && (
              <p className="mt-1 text-sm font-bold text-green-700">
                {selectedStoreFromRanking.branch}
              </p>
            )}

            <p className="mt-2 text-sm text-green-800">
              Los precios esperados de esta compra se calcularon únicamente con esta sucursal.
            </p>
          </div>
        ) : null}

        {/* ====================================
            SUCURSAL
        ==================================== */}

        {smartPurchasePlan &&
        currentSmartStop ? (
          <div className="mt-6 rounded-3xl border border-green-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-green-600">
                  Parada {currentStopIndex + 1} de {smartPurchasePlan.stores.length}
                </p>

                <p className="mt-2 text-xl font-black text-slate-900">
                  {currentSmartStop.storeName}
                </p>

                <p className="mt-1 font-bold text-green-700">
                  {currentSmartStop.branchName}
                </p>

                {selectedBranch?.address && (
                  <p className="mt-2 text-sm text-slate-500">
                    📍 {selectedBranch.address}
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-green-50 px-4 py-3 text-right">
                <p className="text-xs font-black uppercase tracking-wide text-green-600">
                  En esta parada
                </p>

                <p className="mt-1 text-xl font-black text-green-800">
                  {currentStopCompletedCount}/{currentStopTotal}
                </p>
              </div>
            </div>
          </div>
        ) : (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {selectedBranch ? (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-600">
                Comprando en
              </p>

              <div className="mt-2">
                <p className="text-xl font-black text-slate-900">
                  {
                    selectedBranch.storeName
                  }
                </p>

                <p className="mt-1 font-bold text-green-700">
                  {
                    selectedBranch.branchName
                  }
                </p>

                {selectedBranch.address && (
                  <p className="mt-2 text-sm text-slate-500">
                    📍{" "}
                    {
                      selectedBranch.address
                    }
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="font-black text-slate-900">
                📍 ¿Dónde estás comprando?
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Elige la sucursal una sola vez. Los precios que reportes se asociarán automáticamente.
              </p>
            </div>
          )}

          <div className="mt-4">
            <select
              value={
                selectedBranchId
              }
              onChange={(
                event,
              ) => {
                setSelectedBranchId(
                  event.target.value,
                );

                setBranchMessage(
                  null,
                );
              }}
              disabled={
                loadingBranches
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
            >
              <option value="">
                {loadingBranches
                  ? "Cargando sucursales..."
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
                    {
                      branch.storeName
                    }{" "}
                    —{" "}
                    {
                      branch.branchName
                    }
                  </option>
                ),
              )}
            </select>

            <button
              type="button"
              disabled={
                !selectedBranchId ||
                savingBranch
              }
              onClick={() =>
                void saveSelectedBranch()
              }
              className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingBranch
                ? "Guardando..."
                : "Guardar sucursal"}
            </button>

            {branchMessage && (
              <p className="mt-2 text-sm font-bold text-green-700">
                {
                  branchMessage
                }
              </p>
            )}
          </div>
        </div>

        )}
        {/* ====================================
            CARGANDO VIAJE
        ==================================== */}

        {loadingPersistentList ||
        loading ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <p className="font-bold text-slate-600">
              Preparando tu compra...
            </p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6">
            <p className="font-black text-red-700">
              No pudimos abrir el modo compra.
            </p>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          </div>
        ) : totalCount ===
          0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <div className="text-4xl">
              🛒
            </div>

            <p className="mt-4 font-black text-slate-900">
              No tienes productos para comprar.
            </p>

            <Link
              to="/lista"
              className="mt-5 inline-flex rounded-xl bg-green-600 px-5 py-3 font-black text-white"
            >
              Ir a Mi lista
            </Link>
          </div>
        ) : (
          <>
            {/* ==================================
                PROGRESO
            ================================== */}

            <div className="mt-7 rounded-3xl bg-green-900 p-5 text-white">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-green-200">
                    Progreso
                  </p>

                  <p className="mt-1 text-2xl font-black">
                    {completedCount} de{" "}
                    {totalCount}
                  </p>

                  <p className="mt-1 text-sm text-green-100">
                    {pendingCount ===
                    0
                      ? "¡Ya tienes todo!"
                      : `${pendingCount} producto${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"}`}
                  </p>
                </div>

                <p className="text-3xl font-black">
                  {progress}%
                </p>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-green-800">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{
                    width:
                      `${progress}%`,
                  }}
                />
              </div>
            </div>

            {/* ==================================
                CHECKLIST
            ================================== */}

            <div className="mt-5 space-y-3">
              {visibleTripItems.map(
                (
                  tripItem,
                ) => {
                  const key =
                    getItemKey(
                      tripItem.productId,
                      tripItem.presentationId,
                    );

                  const shoppingItem =
                    shoppingItemByKey.get(
                      key,
                    );

                  if (
                    !shoppingItem
                  ) {
                    return null;
                  }

                  return (
                    <div
                      key={
                        tripItem.id
                      }
                      className={`rounded-3xl border p-5 shadow-sm transition ${
                        tripItem.checked
                          ? "border-green-300 bg-green-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* ======================
                            CHECK
                        ====================== */}

                        <button
                          type="button"
                          aria-label={`Marcar ${shoppingItem.product.name}`}
                          onClick={() =>
                            void toggleChecked(
                              tripItem,
                            )
                          }
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-xl font-black transition ${
                            tripItem.checked
                              ? "border-green-600 bg-green-600 text-white"
                              : "border-slate-300 bg-white text-transparent hover:border-green-400"
                          }`}
                        >
                          ✓
                        </button>

                        {/* ======================
                            PRODUCTO
                        ====================== */}

                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between gap-4">
                            <div>
                              <p
                                className={`text-lg font-black ${
                                  tripItem.checked
                                    ? "text-green-800 line-through"
                                    : "text-slate-900"
                                }`}
                              >
                                {
                                  shoppingItem
                                    .product
                                    .name
                                }
                              </p>

                              {shoppingItem
                                .product
                                .brand && (
                                <p className="mt-1 text-sm text-slate-500">
                                  {
                                    shoppingItem
                                      .product
                                      .brand
                                  }
                                </p>
                              )}
                            </div>

                            <span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">
                              ×
                              {
                                tripItem.quantity
                              }
                            </span>
                          </div>

                          {/* ====================
                              PRESENTACIÓN
                          ==================== */}

                          {shoppingItem
                            .presentation && (
                            <p className="mt-2 text-sm font-bold text-green-700">
                              {
                                shoppingItem
                                  .presentation
                                  .presentationName
                              }
                            </p>
                          )}

                          {/* ====================
                              PRECIOS
                          ==================== */}

                          <div className="mt-4 border-t border-slate-100 pt-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                {tripItem.expectedPrice !==
                                  null && (
                                  <>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                      Precio esperado
                                    </p>

                                    <p className="mt-1 text-xl font-black text-slate-900">
                                      $
                                      {tripItem.expectedPrice.toFixed(
                                        2,
                                      )}
                                    </p>
                                  </>
                                )}

                                {tripItem.actualPrice !==
                                  null && (
                                  <div className="mt-3">
                                    <p className="text-xs font-bold uppercase tracking-wide text-green-600">
                                      Precio visto por ti
                                    </p>

                                    <p className="mt-1 text-xl font-black text-green-700">
                                      $
                                      {tripItem.actualPrice.toFixed(
                                        2,
                                      )}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setReportingItemId(
                                    tripItem.id,
                                  );

                                  setReportedPrice(
                                    tripItem.actualPrice !==
                                      null
                                      ? String(
                                          tripItem.actualPrice,
                                        )
                                      : "",
                                  );

                                  if (
                                    !selectedBranch
                                  ) {
                                    setReportMessage(
                                      "Primero selecciona la sucursal donde estás comprando.",
                                    );

                                    return;
                                  }

                                  setReportMessage(
                                    null,
                                  );
                                }}
                                className="rounded-xl px-3 py-2 text-sm font-black text-green-700 transition hover:bg-green-100"
                              >
                                ✏️ ¿Cambió el precio?
                              </button>
                            </div>

                            {/* ==================
                                FORMULARIO PRECIO
                            ================== */}

                            {reportingItemId ===
                              tripItem.id && (
                              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
                                <p className="font-black text-slate-900">
                                  Actualizar precio
                                </p>

                                {selectedBranch && (
                                  <div className="mt-3 rounded-xl bg-white p-3">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                      Reportando en
                                    </p>

                                    <p className="mt-1 font-black text-slate-900">
                                      {
                                        selectedBranch
                                          .storeName
                                      }
                                    </p>

                                    <p className="text-sm font-bold text-green-700">
                                      {
                                        selectedBranch
                                          .branchName
                                      }
                                    </p>
                                  </div>
                                )}

                                {tripItem.expectedPrice !==
                                  null && (
                                  <div className="mt-3 rounded-xl bg-white p-3">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                      Precio que esperaba Listik
                                    </p>

                                    <p className="mt-1 text-lg font-black text-slate-900">
                                      $
                                      {tripItem.expectedPrice.toFixed(
                                        2,
                                      )}
                                    </p>
                                  </div>
                                )}

                                <label className="mt-4 block">
                                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                    Precio actual
                                  </span>

                                  <div className="mt-2 flex items-center rounded-xl border border-green-300 bg-white px-4">
                                    <span className="font-black text-slate-500">
                                      $
                                    </span>

                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      inputMode="decimal"
                                      value={
                                        reportedPrice
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        setReportedPrice(
                                          event
                                            .target
                                            .value,
                                        )
                                      }
                                      placeholder="0.00"
                                      className="w-full bg-transparent px-2 py-3 text-lg font-black text-slate-900 outline-none"
                                    />
                                  </div>
                                </label>

                                {reportMessage && (
                                  <p className="mt-3 text-sm font-bold text-amber-700">
                                    {
                                      reportMessage
                                    }
                                  </p>
                                )}

                                <div className="mt-4 flex gap-2">
                                  <button
                                    type="button"
                                    disabled={
                                      savingReport ||
                                      !selectedBranch
                                    }
                                    onClick={() =>
                                      void submitPriceReport(
                                        tripItem,
                                      )
                                    }
                                    className="flex-1 rounded-xl bg-green-600 px-4 py-3 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {savingReport
                                      ? "Guardando..."
                                      : "Guardar precio"}
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      savingReport
                                    }
                                    onClick={() => {
                                      setReportingItemId(
                                        null,
                                      );

                                      setReportedPrice(
                                        "",
                                      );

                                      setReportMessage(
                                        null,
                                      );
                                    }}
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-600"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>

            {/* ==================================
                TOTAL
            ================================== */}

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-500">
                    Total estimado
                  </p>

                  <p className="mt-1 text-3xl font-black text-slate-900">
                    $
                    {estimatedTotal.toFixed(
                      2,
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-black text-green-700">
                    {completedCount}/
                    {totalCount}
                  </p>

                  <p className="text-xs font-bold text-slate-400">
                    productos
                  </p>
                </div>
              </div>
            </div>

            {/* ==================================
                TERMINAR COMPRA
            ================================== */}

            {smartPurchasePlan &&
            !isLastSmartStop ? (
              <button
                type="button"
                disabled={
                  currentStopPendingCount > 0
                }
                onClick={
                  goToNextSmartStop
                }
                className="mt-5 w-full rounded-2xl bg-green-600 px-6 py-4 text-lg font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {currentStopPendingCount > 0
                  ? `Completa esta parada (${currentStopPendingCount} pendientes)`
                  : `✅ Terminar parada ${currentStopIndex + 1} y continuar`}
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  finishing
                }
                onClick={() =>
                  void finishTrip()
                }
                className="mt-5 w-full rounded-2xl bg-green-600 px-6 py-4 text-lg font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {finishing
                  ? "Terminando..."
                  : completedCount === totalCount
                    ? "✅ Terminar compra"
                    : `Terminar compra (${pendingCount} pendientes)`}
              </button>
            )}
          </>
        )}
      </section>
    </main>
  );
}