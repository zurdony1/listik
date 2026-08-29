import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useAuth,
} from "../contexts/AuthContext";

import {
  supabase,
} from "../lib/supabase";

import type {
  Product,
  ProductPresentation,
} from "../types/Product";

import {
  getProductPrices,
  type ProductPrice,
} from "../services/api/productPriceApi";

import {
  addShoppingListItem,
  clearShoppingList,
  getOrCreateDefaultShoppingList,
  getShoppingListItems,
  removeShoppingListItem,
  updateShoppingListItemQuantity,
} from "../services/shoppingListService";

/*
 * ==========================================
 * ITEM DE LA INTERFAZ
 * ==========================================
 */

export interface ShoppingListItem {
  product: Product;

  presentation:
    | ProductPresentation
    | null;

  presentationId:
    | string
    | null;

  /*
   * Precios actuales de esta presentación.
   */
  prices: ProductPrice[];

  quantity: number;

  /*
   * Registro correspondiente en Supabase.
   */
  persistedItemId:
    | string
    | null;

  /*
   * Más adelante nos permitirá tener:
   *
   * Mi lista habitual
   *
   * ✓ comprar esta vez
   * ○ dejar para otra compra
   */
  isActive: boolean;
}

/*
 * ==========================================
 * ITEM PERSISTENTE
 * ==========================================
 */

interface PersistedItemData {
  id: string;

  productId: string;

  presentationId:
    | string
    | null;

  quantity: number;

  isActive: boolean;
}

/*
 * ==========================================
 * PRODUCTO CRUDO DE SUPABASE
 * ==========================================
 */

interface RawPresentation {
  id: string;

  product_id:
    | string
    | null;

  presentation_name:
    | string
    | null;

  size_value:
    | number
    | string
    | null;

  size_unit:
    | string
    | null;

  units_per_package:
    | number
    | string
    | null;

  package_type:
    | string
    | null;
}

interface RawProduct {
  id: string;

  name: string;

  brand:
    | string
    | null;

  category:
    | string
    | null;

  barcode:
    | string
    | null;

  image_url:
    | string
    | null;

  product_presentations:
    RawPresentation[];
}

/*
 * ==========================================
 * NORMALIZAR PRODUCTO
 * ==========================================
 */

function normalizeProduct(
  rawProduct: RawProduct,
): Product {
  return {
    id:
      String(
        rawProduct.id,
      ),

    name:
      String(
        rawProduct.name,
      ),

    brand:
      rawProduct.brand ??
      null,

    category:
      rawProduct.category ??
      null,

    barcode:
      rawProduct.barcode ??
      null,

    image_url:
      rawProduct.image_url ??
      null,

    /*
     * Los precios se cargan después
     * con productPriceApi.
     */
    prices:
      [],

    presentations:
      (
        rawProduct.product_presentations ??
        []
      ).map(
        (
          presentation,
        ) => ({
          id:
            String(
              presentation.id,
            ),

          productId:
            String(
              presentation.product_id ??
              rawProduct.id,
            ),

          presentationName:
            String(
              presentation.presentation_name ??
              "",
            ),

          sizeValue:
            presentation.size_value ===
            null
              ? null
              : Number(
                  presentation.size_value,
                ),

          sizeUnit:
            presentation.size_unit ??
            null,

          unitsPerPackage:
            presentation.units_per_package ===
            null
              ? 1
              : Number(
                  presentation.units_per_package,
                ),

          packageType:
            presentation.package_type ??
            null,
        }),
      ),
  };
}

/*
 * ==========================================
 * HOOK
 * ==========================================
 */

export function useShoppingList() {
  /*
   * ========================================
   * USUARIO + UBICACIÓN
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
    profile?.municipality
      ?.trim() ??
    "";

  /*
   * ========================================
   * ITEMS ACTIVOS EN LA INTERFAZ
   * ========================================
   */

  const [
    items,
    setItems,
  ] =
    useState<
      ShoppingListItem[]
    >([]);

  /*
   * ========================================
   * LISTA PREDETERMINADA
   * ========================================
   */

  const [
    listId,
    setListId,
  ] =
    useState<
      string | null
    >(
      null,
    );

  /*
   * ========================================
   * CACHE DE SUPABASE
   * ========================================
   */

  const [
    persistedItems,
    setPersistedItems,
  ] =
    useState<
      PersistedItemData[]
    >([]);

  /*
   * ========================================
   * ESTADOS
   * ========================================
   */

  const [
    loadingPersistentList,
    setLoadingPersistentList,
  ] =
    useState(
      true,
    );

  const [
    persistenceError,
    setPersistenceError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  /*
   * ========================================
   * COMPONENTE MONTADO
   * ========================================
   */

  const mountedRef =
    useRef(
      true,
    );

  useEffect(
    () => {
      mountedRef.current =
        true;

      return () => {
        mountedRef.current =
          false;
      };
    },
    [],
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
   * BUSCAR CACHE PERSISTENTE
   * ========================================
   */

  const findPersistedItem =
    useCallback(
      (
        productId: string,
        presentationId:
          | string
          | null,
      ) => {
        const key =
          getItemKey(
            productId,
            presentationId,
          );

        return (
          persistedItems.find(
            (
              item,
            ) =>
              getItemKey(
                item.productId,
                item.presentationId,
              ) ===
              key,
          ) ??
          null
        );
      },
      [
        persistedItems,
        getItemKey,
      ],
    );

  /*
   * ========================================
   * ACTUALIZAR CACHE
   * ========================================
   */

  const upsertPersistedCache =
    useCallback(
      (
        item: PersistedItemData,
      ) => {
        setPersistedItems(
          (
            current,
          ) => {
            const key =
              getItemKey(
                item.productId,
                item.presentationId,
              );

            const existing =
              current.some(
                (
                  currentItem,
                ) =>
                  getItemKey(
                    currentItem.productId,
                    currentItem.presentationId,
                  ) ===
                  key,
              );

            if (
              !existing
            ) {
              return [
                ...current,
                item,
              ];
            }

            return current.map(
              (
                currentItem,
              ) =>
                getItemKey(
                  currentItem.productId,
                  currentItem.presentationId,
                ) ===
                key
                  ? item
                  : currentItem,
            );
          },
        );
      },
      [
        getItemKey,
      ],
    );

  /*
   * ========================================
   * CARGAR PRODUCTOS COMPLETOS
   * ========================================
   */

  const getProductsForPersistentItems =
    useCallback(
      async (
        savedItems:
          PersistedItemData[],
      ) => {
        const productIds =
          Array.from(
            new Set(
              savedItems.map(
                (
                  item,
                ) =>
                  item.productId,
              ),
            ),
          );

        if (
          productIds.length ===
          0
        ) {
          return new Map<
            string,
            Product
          >();
        }

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "products",
            )
            .select(`
              id,
              name,
              brand,
              category,
              barcode,
              image_url,

              product_presentations(
                id,
                product_id,
                presentation_name,
                size_value,
                size_unit,
                units_per_package,
                package_type
              )
            `)
            .in(
              "id",
              productIds,
            );

        if (
          error
        ) {
          throw new Error(
            `No se pudieron cargar los productos de Mi lista: ${error.message}`,
          );
        }

        const productMap =
          new Map<
            string,
            Product
          >();

        for (
          const rawProduct
          of (
            data ??
            []
          ) as RawProduct[]
        ) {
          const product =
            normalizeProduct(
              rawProduct,
            );

          productMap.set(
            product.id,
            product,
          );
        }

        return productMap;
      },
      [],
    );

  /*
   * ========================================
   * HIDRATAR MI LISTA
   * ========================================
   *
   * Supabase contiene:
   *
   * product_id
   * presentation_id
   * quantity
   *
   * Pero React necesita:
   *
   * Product completo
   * presentación
   * precios actuales
   * cantidad
   */

  const hydratePersistentItems =
    useCallback(
      async (
        savedItems:
          PersistedItemData[],
      ) => {
        /*
         * Solamente mostramos los artículos
         * activos en la compra actual.
         *
         * Los inactivos seguirán guardados
         * para la futura "lista habitual".
         */

        const activeItems =
          savedItems.filter(
            (
              item,
            ) =>
              item.isActive,
          );

        if (
          activeItems.length ===
          0
        ) {
          return [];
        }

        const productMap =
          await getProductsForPersistentItems(
            activeItems,
          );

        /*
         * ==================================
         * PRECIOS ACTUALES
         * ==================================
         *
         * Se consultan nuevamente al abrir
         * Listik.
         *
         * NO guardamos precios viejos en
         * shopping_list_items.
         */

        const hydratedResults =
          await Promise.all(
            activeItems.map(
              async (
                savedItem,
              ) => {
                const product =
                  productMap.get(
                    savedItem.productId,
                  );

                if (
                  !product
                ) {
                  console.warn(
                    "⚠️ Producto persistente no encontrado:",
                    savedItem.productId,
                  );

                  return null;
                }

                const presentation =
                  savedItem.presentationId
                    ? (
                        product.presentations ??
                        []
                      ).find(
                        (
                          item,
                        ) =>
                          item.id ===
                          savedItem.presentationId,
                      ) ??
                      null
                    : null;

                let prices:
                  ProductPrice[] =
                  [];

                /*
                 * Solamente pedimos precios si
                 * tenemos una zona configurada.
                 */

                if (
                  state &&
                  municipality
                ) {
                  try {
                    const response =
                      await getProductPrices(
                        product.id,
                        {
                          presentationId:
                            savedItem.presentationId,

                          state,

                          municipality,
                        },
                      );

                    prices =
                      response.data.prices ??
                      [];

                      if (
  product.name
    .toLowerCase()
    .includes("refresco")
) {
  console.log(
    "🥤 DEBUG REFRESCO:",
    {
      productId:
        product.id,

      productName:
        product.name,

      savedPresentationId:
        savedItem.presentationId,

      presentation:
        presentation
          ? {
              id:
                presentation.id,

              name:
                presentation.presentationName,
            }
          : null,

      pricesReceived:
        response.data.prices.length,

      prices:
        response.data.prices.map(
          (price) => ({
            price:
              price.price,

            store:
              price.storeName,

            branch:
              price.branch,

            storeBranchId:
              price.storeBranchId,
          }),
        ),
    },
  );
}
                  } catch (
                    priceError
                  ) {
                    /*
                     * Un precio que falle NO debe
                     * hacer desaparecer el producto.
                     */

                    console.error(
                      `Error actualizando precios de ${product.name}:`,
                      priceError,
                    );
                  }
                }

                const hydratedItem:
                  ShoppingListItem =
                  {
                    product,

                    presentation,

                    presentationId:
                      savedItem.presentationId,

                    prices,

                    quantity:
                      savedItem.quantity,

                    persistedItemId:
                      savedItem.id,

                    isActive:
                      savedItem.isActive,
                  };

                return hydratedItem;
              },
            ),
          );

        return hydratedResults.filter(
          (
            item,
          ): item is ShoppingListItem =>
            item !==
            null,
        );
      },
      [
        state,
        municipality,
        getProductsForPersistentItems,
      ],
    );

  /*
   * ========================================
   * CARGAR MI LISTA
   * ========================================
   */

  const loadPersistentList =
    useCallback(
      async () => {
        /*
         * Esperamos a que AuthContext termine.
         */

        if (
          authLoading ||
          profileLoading
        ) {
          return;
        }

        /*
         * Sin sesión usamos solamente
         * estado local.
         */

        if (
          !user
        ) {
          setLoadingPersistentList(
            false,
          );

          return;
        }

        try {
          setLoadingPersistentList(
            true,
          );

          setPersistenceError(
            null,
          );

          /*
           * ==================================
           * MI LISTA
           * ==================================
           */

          const list =
            await getOrCreateDefaultShoppingList();

          if (
            !mountedRef.current
          ) {
            return;
          }

          setListId(
            list.id,
          );

          /*
           * ==================================
           * ITEMS GUARDADOS
           * ==================================
           */

          const savedItems =
            await getShoppingListItems(
              list.id,
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          const normalizedSavedItems:
            PersistedItemData[] =
            savedItems.map(
              (
                item,
              ) => ({
                id:
                  item.id,

                productId:
                  item.productId,

                presentationId:
                  item.presentationId,

                quantity:
                  item.quantity,

                isActive:
                  item.isActive,
              }),
            );

          setPersistedItems(
            normalizedSavedItems,
          );

          /*
           * ==================================
           * HIDRATAR
           * ==================================
           */

          const hydratedItems =
            await hydratePersistentItems(
              normalizedSavedItems,
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          setItems(
            hydratedItems,
          );

          console.log(
            "🛒 MI LISTA RESTAURADA:",
            {
              listId:
                list.id,

              saved:
                normalizedSavedItems.length,

              active:
                hydratedItems.length,

              state:
                state ||
                null,

              municipality:
                municipality ||
                null,
            },
          );
        } catch (
          error
        ) {
          console.error(
            "❌ Error cargando Mi lista:",
            error,
          );

          if (
            mountedRef.current
          ) {
            setPersistenceError(
              error instanceof Error
                ? error.message
                : "No se pudo cargar Mi lista.",
            );
          }
        } finally {
          if (
            mountedRef.current
          ) {
            setLoadingPersistentList(
              false,
            );
          }
        }
      },
      [
        user,
        authLoading,
        profileLoading,
        state,
        municipality,
        hydratePersistentItems,
      ],
    );

  /*
   * ========================================
   * CARGAR AL ENTRAR
   * ========================================
   */

  useEffect(
    () => {
      void loadPersistentList();
    },
    [
      loadPersistentList,
    ],
  );

  /*
   * ========================================
   * AGREGAR PRODUCTO
   * ========================================
   */

  const addProduct =
    useCallback(
      (
        product: Product,
        presentationId:
          | string
          | null = null,
        prices:
          ProductPrice[] = [],
      ) => {
        const presentation =
          presentationId
            ? (
                product.presentations ??
                []
              ).find(
                (
                  item,
                ) =>
                  item.id ===
                  presentationId,
              ) ??
              null
            : null;

        const itemKey =
          getItemKey(
            product.id,
            presentationId,
          );

        /*
         * ==================================
         * UI INMEDIATA
         * ==================================
         */

        setItems(
          (
            currentItems,
          ) => {
            const existingItem =
              currentItems.find(
                (
                  item,
                ) =>
                  getItemKey(
                    item.product.id,
                    item.presentationId,
                  ) ===
                  itemKey,
              );

            if (
              existingItem
            ) {
              return currentItems.map(
                (
                  item,
                ) =>
                  getItemKey(
                    item.product.id,
                    item.presentationId,
                  ) ===
                  itemKey
                    ? {
                        ...item,

                        prices,

                        quantity:
                          item.quantity +
                          1,

                        isActive:
                          true,
                      }
                    : item,
              );
            }

            return [
              ...currentItems,

              {
                product,

                presentation,

                presentationId,

                prices,

                quantity:
                  1,

                persistedItemId:
                  findPersistedItem(
                    product.id,
                    presentationId,
                  )?.id ??
                  null,

                isActive:
                  true,
              },
            ];
          },
        );

        /*
         * ==================================
         * GUARDAR EN SUPABASE
         * ==================================
         */

        void (
          async () => {
            try {
              let targetListId =
                listId;

              /*
               * Si el usuario agrega demasiado
               * rápido y todavía no tenemos
               * listId, lo obtenemos aquí.
               */

              if (
                !targetListId
              ) {
                const defaultList =
                  await getOrCreateDefaultShoppingList();

                targetListId =
                  defaultList.id;

                if (
                  mountedRef.current
                ) {
                  setListId(
                    defaultList.id,
                  );
                }
              }

              const savedItem =
                await addShoppingListItem(
                  targetListId,
                  product.id,
                  presentationId,
                );

              upsertPersistedCache({
                id:
                  savedItem.id,

                productId:
                  savedItem.productId,

                presentationId:
                  savedItem.presentationId,

                quantity:
                  savedItem.quantity,

                isActive:
                  savedItem.isActive,
              });

              if (
                mountedRef.current
              ) {
                setItems(
                  (
                    currentItems,
                  ) =>
                    currentItems.map(
                      (
                        item,
                      ) =>
                        getItemKey(
                          item.product.id,
                          item.presentationId,
                        ) ===
                        itemKey
                          ? {
                              ...item,

                              persistedItemId:
                                savedItem.id,

                              quantity:
                                savedItem.quantity,

                              isActive:
                                savedItem.isActive,
                            }
                          : item,
                    ),
                );
              }

              console.log(
                "💾 PRODUCTO GUARDADO EN MI LISTA:",
                {
                  product:
                    product.name,

                  productId:
                    product.id,

                  presentationId,

                  quantity:
                    savedItem.quantity,
                },
              );
            } catch (
              error
            ) {
              console.error(
                "❌ No se pudo guardar el producto:",
                error,
              );

              if (
                mountedRef.current
              ) {
                setPersistenceError(
                  error instanceof Error
                    ? error.message
                    : "No se pudo guardar el producto.",
                );
              }
            }
          }
        )();
      },
      [
        listId,
        findPersistedItem,
        getItemKey,
        upsertPersistedCache,
      ],
    );

  /*
   * ========================================
   * ELIMINAR
   * ========================================
   */

  const removeProduct =
    useCallback(
      (
        productId: string,
        presentationId:
          | string
          | null = null,
      ) => {
        const itemKey =
          getItemKey(
            productId,
            presentationId,
          );

        const persisted =
          findPersistedItem(
            productId,
            presentationId,
          );

        setItems(
          (
            currentItems,
          ) =>
            currentItems.filter(
              (
                item,
              ) =>
                getItemKey(
                  item.product.id,
                  item.presentationId,
                ) !==
                itemKey,
            ),
        );

        if (
          !persisted
        ) {
          return;
        }

        void (
          async () => {
            try {
              await removeShoppingListItem(
                persisted.id,
              );

              setPersistedItems(
                (
                  current,
                ) =>
                  current.filter(
                    (
                      item,
                    ) =>
                      item.id !==
                      persisted.id,
                  ),
              );
            } catch (
              error
            ) {
              console.error(
                "❌ No se pudo eliminar el producto:",
                error,
              );

              setPersistenceError(
                error instanceof Error
                  ? error.message
                  : "No se pudo eliminar el producto.",
              );
            }
          }
        )();
      },
      [
        findPersistedItem,
        getItemKey,
      ],
    );

  /*
   * ========================================
   * AUMENTAR CANTIDAD
   * ========================================
   */

  const increaseQuantity =
    useCallback(
      (
        productId: string,
        presentationId:
          | string
          | null = null,
      ) => {
        const itemKey =
          getItemKey(
            productId,
            presentationId,
          );

        const localItem =
          items.find(
            (
              item,
            ) =>
              getItemKey(
                item.product.id,
                item.presentationId,
              ) ===
              itemKey,
          );

        if (
          !localItem
        ) {
          return;
        }

        const nextQuantity =
          localItem.quantity +
          1;

        setItems(
          (
            currentItems,
          ) =>
            currentItems.map(
              (
                item,
              ) =>
                getItemKey(
                  item.product.id,
                  item.presentationId,
                ) ===
                itemKey
                  ? {
                      ...item,

                      quantity:
                        nextQuantity,
                    }
                  : item,
            ),
        );

        const persisted =
          findPersistedItem(
            productId,
            presentationId,
          );

        if (
          !persisted
        ) {
          return;
        }

        void (
          async () => {
            try {
              const savedItem =
                await updateShoppingListItemQuantity(
                  persisted.id,
                  nextQuantity,
                );

              upsertPersistedCache({
                id:
                  savedItem.id,

                productId:
                  savedItem.productId,

                presentationId:
                  savedItem.presentationId,

                quantity:
                  savedItem.quantity,

                isActive:
                  savedItem.isActive,
              });
            } catch (
              error
            ) {
              console.error(
                "❌ No se pudo aumentar la cantidad:",
                error,
              );
            }
          }
        )();
      },
      [
        items,
        findPersistedItem,
        getItemKey,
        upsertPersistedCache,
      ],
    );

  /*
   * ========================================
   * DISMINUIR CANTIDAD
   * ========================================
   */

  const decreaseQuantity =
    useCallback(
      (
        productId: string,
        presentationId:
          | string
          | null = null,
      ) => {
        const itemKey =
          getItemKey(
            productId,
            presentationId,
          );

        const localItem =
          items.find(
            (
              item,
            ) =>
              getItemKey(
                item.product.id,
                item.presentationId,
              ) ===
              itemKey,
          );

        if (
          !localItem
        ) {
          return;
        }

        if (
          localItem.quantity <=
          1
        ) {
          removeProduct(
            productId,
            presentationId,
          );

          return;
        }

        const nextQuantity =
          localItem.quantity -
          1;

        setItems(
          (
            currentItems,
          ) =>
            currentItems.map(
              (
                item,
              ) =>
                getItemKey(
                  item.product.id,
                  item.presentationId,
                ) ===
                itemKey
                  ? {
                      ...item,

                      quantity:
                        nextQuantity,
                    }
                  : item,
            ),
        );

        const persisted =
          findPersistedItem(
            productId,
            presentationId,
          );

        if (
          !persisted
        ) {
          return;
        }

        void (
          async () => {
            try {
              const savedItem =
                await updateShoppingListItemQuantity(
                  persisted.id,
                  nextQuantity,
                );

              upsertPersistedCache({
                id:
                  savedItem.id,

                productId:
                  savedItem.productId,

                presentationId:
                  savedItem.presentationId,

                quantity:
                  savedItem.quantity,

                isActive:
                  savedItem.isActive,
              });
            } catch (
              error
            ) {
              console.error(
                "❌ No se pudo disminuir la cantidad:",
                error,
              );
            }
          }
        )();
      },
      [
        items,
        findPersistedItem,
        getItemKey,
        removeProduct,
        upsertPersistedCache,
      ],
    );

  /*
   * ========================================
   * VACIAR LISTA
   * ========================================
   */

  const clearList =
    useCallback(
      () => {
        setItems(
          [],
        );

        setPersistedItems(
          [],
        );

        if (
          !listId
        ) {
          return;
        }

        void (
          async () => {
            try {
              await clearShoppingList(
                listId,
              );
            } catch (
              error
            ) {
              console.error(
                "❌ No se pudo vaciar Mi lista:",
                error,
              );
            }
          }
        )();
      },
      [
        listId,
      ],
    );

  /*
   * ========================================
   * API DEL HOOK
   * ========================================
   */

  return {
    items,

    addProduct,

    removeProduct,

    increaseQuantity,

    decreaseQuantity,

    clearList,

    /*
     * Persistencia
     */

    listId,

    persistedItems,

    loadingPersistentList,

    persistenceError,

    reloadPersistentList:
      loadPersistentList,
  };
}