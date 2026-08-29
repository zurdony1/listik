import type {
  ShoppingListItem,
} from "../hooks/useShoppingList";

/*
 * ==========================================
 * TOTAL POR TIENDA
 * ==========================================
 */

export interface StoreTotal {
  storeKey: string;

  storeId: string;

  storeBranchId:
    | string
    | null;

  storeName: string;

  branch:
    | string
    | null;

  total: number;

  availableItems: number;

  requestedItems: number;

  missingItems: number;

  coverage: number;

  complete: boolean;
}

/*
 * ==========================================
 * COMPRA INTELIGENTE
 * ==========================================
 */

export interface SmartPurchaseItem {
  itemKey: string;

  productId: string;

  productName: string;

  presentationId:
    | string
    | null;

  presentationName:
    | string
    | null;

  quantity: number;

  unitPrice: number;

  subtotal: number;

  storeId: string;

  storeName: string;

  branch:
    | string
    | null;

  source:
    | string
    | null;

  observedAt:
    | string
    | null;
}

export interface SmartPurchaseStore {
  storeKey: string;

  storeId: string;

  storeName: string;

  branch:
    | string
    | null;

  itemCount: number;

  subtotal: number;
}

export interface SmartPurchaseResult {
  total: number;

  availableItems: number;

  requestedItems: number;

  missingItems: number;

  coverage: number;

  complete: boolean;

  storeCount: number;

  items:
    SmartPurchaseItem[];

  stores:
    SmartPurchaseStore[];
}

/*
 * ==========================================
 * COMPRA EQUILIBRADA
 * ==========================================
 *
 * Objetivo:
 *
 * encontrar la MENOR cantidad de tiendas
 * que pueda cubrir toda la lista.
 *
 * Si existen varias combinaciones con
 * el mismo número de tiendas,
 * elegimos la más barata.
 */

export interface BalancedPurchaseResult {
  found: boolean;

  complete: boolean;

  total: number;

  storeCount: number;

  storesSavedVsSmart: number;

  extraCostVsSmart: number;

  items:
    SmartPurchaseItem[];

  stores:
    SmartPurchaseStore[];

  message: string;
}

/*
 * ==========================================
 * RECOMENDACIÓN LISTIK
 * ==========================================
 */

export type ListikRecommendationType =
  | "single-store"
  | "smart-purchase"
  | "no-complete-store";

export interface ListikRecommendation {
  hasCompleteStore: boolean;

  bestSingleStore:
    | StoreTotal
    | null;

  smartPurchase:
    SmartPurchaseResult;

  singleStoreTotal:
    | number
    | null;

  smartTotal: number;

  savings:
    | number
    | null;

  extraStores: number;

  recommendation:
    ListikRecommendationType;

  message: string;
}

/*
 * ==========================================
 * HELPERS
 * ==========================================
 */

function normalizeBranch(
  branch:
    | string
    | null,
) {
  return (
    branch
      ?.trim()
      .toLowerCase() ??
    ""
  );
}

function createStoreKey(
  storeId: string,
  branch:
    | string
    | null,
) {
  return `${storeId}::${normalizeBranch(
    branch,
  )}`;
}

function createItemKey(
  item: ShoppingListItem,
) {
  return `${item.product.id}::${
    item.presentationId ??
    "no-presentation"
  }`;
}

/*
 * ==========================================
 * CALCULAR TOTALES POR TIENDA
 * ==========================================
 */

export function calculateStoreTotals(
  items: ShoppingListItem[],
): StoreTotal[] {
  if (
    items.length ===
    0
  ) {
    return [];
  }

  const stores =
    new Map<
      string,
      {
        storeId: string;

        storeBranchId:
          | string
          | null;

        storeName: string;

        branch:
          | string
          | null;
      }
    >();

  /*
   * Reunir todas las tiendas
   * disponibles.
   */

  for (
    const item
    of items
  ) {
    for (
      const price
      of item.prices
    ) {
      const storeKey =
        createStoreKey(
          price.storeId,
          price.branch,
        );

      if (
        stores.has(
          storeKey,
        )
      ) {
        continue;
      }

      stores.set(
        storeKey,
        {
          storeId:
            price.storeId,

          storeBranchId:
            price.storeBranchId,

          storeName:
            price.storeName,

          branch:
            price.branch,
        },
      );
    }
  }

  const totals:
    StoreTotal[] = [];

  /*
   * Calcular cobertura y total
   * para cada tienda.
   */

  for (
    const [
      storeKey,
      store,
    ]
    of stores
  ) {
    let total =
      0;

    let availableItems =
      0;

    for (
      const item
      of items
    ) {
      const price =
        item.prices.find(
          (
            candidate,
          ) =>
            createStoreKey(
              candidate.storeId,
              candidate.branch,
            ) ===
            storeKey,
        );

      if (!price) {
        continue;
      }

      availableItems++;

      total +=
        price.price *
        item.quantity;
    }

    const requestedItems =
      items.length;

    const missingItems =
      Math.max(
        0,
        requestedItems -
          availableItems,
      );

    const coverage =
      requestedItems >
      0
        ? Math.round(
            (
              availableItems /
              requestedItems
            ) *
              100,
          )
        : 0;

    totals.push({
      storeKey,

      storeId:
        store.storeId,

      storeBranchId:
        store.storeBranchId,

      storeName:
        store.storeName,

      branch:
        store.branch,

      total:
        Number(
          total.toFixed(
            2,
          ),
        ),

      availableItems,

      requestedItems,

      missingItems,

      coverage,

      complete:
        missingItems ===
        0,
    });
  }

  /*
   * Ranking:
   *
   * 1. completas
   * 2. mayor cobertura
   * 3. menor total
   */

  return totals.sort(
    (
      a,
      b,
    ) => {
      if (
        a.complete !==
        b.complete
      ) {
        return a.complete
          ? -1
          : 1;
      }

      if (
        a.availableItems !==
        b.availableItems
      ) {
        return (
          b.availableItems -
          a.availableItems
        );
      }

      return (
        a.total -
        b.total
      );
    },
  );
}

/*
 * ==========================================
 * CALCULAR COMPRA INTELIGENTE
 * ==========================================
 *
 * Elige el precio más barato
 * de cada producto sin importar
 * cuántas tiendas sean necesarias.
 */

export function calculateSmartPurchase(
  items: ShoppingListItem[],
): SmartPurchaseResult {
  if (
    items.length ===
    0
  ) {
    return {
      total:
        0,

      availableItems:
        0,

      requestedItems:
        0,

      missingItems:
        0,

      coverage:
        0,

      complete:
        false,

      storeCount:
        0,

      items:
        [],

      stores:
        [],
    };
  }

  const smartItems:
    SmartPurchaseItem[] = [];

  /*
   * Mejor precio por artículo.
   */

  for (
    const item
    of items
  ) {
    if (
      item.prices.length ===
      0
    ) {
      continue;
    }

    const bestPrice =
      item.prices.reduce(
        (
          best,
          current,
        ) =>
          current.price <
          best.price
            ? current
            : best,
      );

    const subtotal =
      bestPrice.price *
      item.quantity;

    smartItems.push({
      itemKey:
        createItemKey(
          item,
        ),

      productId:
        item.product.id,

      productName:
        item.product.name,

      presentationId:
        item.presentationId,

      presentationName:
        item.presentation
          ?.presentationName ??
        null,

      quantity:
        item.quantity,

      unitPrice:
        bestPrice.price,

      subtotal:
        Number(
          subtotal.toFixed(
            2,
          ),
        ),

      storeId:
        bestPrice.storeId,

      storeName:
        bestPrice.storeName,

      branch:
        bestPrice.branch,

      source:
        bestPrice.source,

      observedAt:
        bestPrice.observedAt,
    });
  }

  const total =
    smartItems.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        item.subtotal,
      0,
    );

  const requestedItems =
    items.length;

  const availableItems =
    smartItems.length;

  const missingItems =
    Math.max(
      0,
      requestedItems -
        availableItems,
    );

  const coverage =
    requestedItems >
    0
      ? Math.round(
          (
            availableItems /
              requestedItems
          ) *
            100,
        )
      : 0;

  const stores =
    groupSmartItemsByStore(
      smartItems,
    );

  return {
    total:
      Number(
        total.toFixed(
          2,
        ),
      ),

    availableItems,

    requestedItems,

    missingItems,

    coverage,

    complete:
      missingItems ===
      0,

    storeCount:
      stores.length,

    items:
      smartItems,

    stores,
  };
}

/*
 * ==========================================
 * AGRUPAR ARTÍCULOS POR TIENDA
 * ==========================================
 */

function groupSmartItemsByStore(
  smartItems:
    SmartPurchaseItem[],
) {
  const storesMap =
    new Map<
      string,
      SmartPurchaseStore
    >();

  for (
    const item
    of smartItems
  ) {
    const storeKey =
      createStoreKey(
        item.storeId,
        item.branch,
      );

    const current =
      storesMap.get(
        storeKey,
      );

    if (!current) {
      storesMap.set(
        storeKey,
        {
          storeKey,

          storeId:
            item.storeId,

          storeName:
            item.storeName,

          branch:
            item.branch,

          itemCount:
            1,

          subtotal:
            item.subtotal,
        },
      );

      continue;
    }

    storesMap.set(
      storeKey,
      {
        ...current,

        itemCount:
          current.itemCount +
          1,

        subtotal:
          Number(
            (
              current.subtotal +
              item.subtotal
            ).toFixed(
              2,
            ),
          ),
      },
    );
  }

  return Array.from(
    storesMap.values(),
  ).sort(
    (
      a,
      b,
    ) =>
      b.subtotal -
      a.subtotal,
  );
}

/*
 * ==========================================
 * COMBINACIONES
 * ==========================================
 *
 * Genera combinaciones de tiendas.
 *
 * Ejemplo:
 *
 * A B C
 *
 * combinaciones de 2:
 *
 * AB
 * AC
 * BC
 */

function getCombinations<T>(
  values: T[],
  size: number,
): T[][] {
  const result:
    T[][] = [];

  function build(
    startIndex: number,
    current: T[],
  ) {
    if (
      current.length ===
      size
    ) {
      result.push([
        ...current,
      ]);

      return;
    }

    for (
      let index =
        startIndex;
      index <
      values.length;
      index++
    ) {
      current.push(
        values[index],
      );

      build(
        index +
          1,
        current,
      );

      current.pop();
    }
  }

  build(
    0,
    [],
  );

  return result;
}

/*
 * ==========================================
 * TODAS LAS TIENDAS DISPONIBLES
 * ==========================================
 */

interface AvailableStore {
  storeKey: string;

  storeId: string;

  storeName: string;

  branch:
    | string
    | null;
}

function getAvailableStores(
  items: ShoppingListItem[],
): AvailableStore[] {
  const map =
    new Map<
      string,
      AvailableStore
    >();

  for (
    const item
    of items
  ) {
    for (
      const price
      of item.prices
    ) {
      const storeKey =
        createStoreKey(
          price.storeId,
          price.branch,
        );

      if (
        map.has(
          storeKey,
        )
      ) {
        continue;
      }

      map.set(
        storeKey,
        {
          storeKey,

          storeId:
            price.storeId,

          storeName:
            price.storeName,

          branch:
            price.branch,
        },
      );
    }
  }

  return Array.from(
    map.values(),
  );
}

/*
 * ==========================================
 * EVALUAR COMBINACIÓN
 * ==========================================
 *
 * Recibe un conjunto de tiendas
 * y revisa:
 *
 * ¿pueden cubrir todos los productos?
 *
 * Si sí:
 *
 * usa el precio más barato disponible
 * dentro de esas tiendas.
 */

function evaluateStoreCombination(
  items: ShoppingListItem[],
  stores: AvailableStore[],
) {
  /*
   * Una combinación vacía nunca
   * puede completar la lista.
   */
  if (
    items.length ===
      0 ||
    stores.length ===
      0
  ) {
    return null;
  }

  const allowedKeys =
    new Set(
      stores.map(
        (
          store,
        ) =>
          store.storeKey,
      ),
    );

  /*
   * Guardamos las llaves esperadas
   * para validar al final que la
   * combinación realmente cubrió
   * TODOS los productos/presentaciones.
   */
  const expectedItemKeys =
    items.map(
      (
        item,
      ) =>
        createItemKey(
          item,
        ),
    );

  const resultItems:
    SmartPurchaseItem[] = [];

  for (
    const item
    of items
  ) {
    const candidatePrices =
      item.prices.filter(
        (
          price,
        ) =>
          allowedKeys.has(
            createStoreKey(
              price.storeId,
              price.branch,
            ),
          ),
      );

    /*
     * Si falta aunque sea un producto,
     * esta combinación queda descartada.
     */
    if (
      candidatePrices.length ===
      0
    ) {
      return null;
    }

    const bestPrice =
      candidatePrices.reduce(
        (
          best,
          current,
        ) =>
          current.price <
          best.price
            ? current
            : best,
      );

    const subtotal =
      bestPrice.price *
      item.quantity;

    resultItems.push({
      itemKey:
        createItemKey(
          item,
        ),

      productId:
        item.product.id,

      productName:
        item.product.name,

      presentationId:
        item.presentationId,

      presentationName:
        item.presentation
          ?.presentationName ??
        null,

      quantity:
        item.quantity,

      unitPrice:
        bestPrice.price,

      subtotal:
        Number(
          subtotal.toFixed(
            2,
          ),
        ),

      storeId:
        bestPrice.storeId,

      storeName:
        bestPrice.storeName,

      branch:
        bestPrice.branch,

      source:
        bestPrice.source,

      observedAt:
        bestPrice.observedAt,
    });
  }

  /*
   * ========================================
   * VALIDACIÓN ESTRICTA DE COBERTURA
   * ========================================
   *
   * Una combinación SOLO es válida si
   * devolvió exactamente un resultado
   * para cada artículo solicitado.
   */
  if (
    resultItems.length !==
    items.length
  ) {
    return null;
  }

  const resultItemKeys =
    new Set(
      resultItems.map(
        (
          item,
        ) =>
          item.itemKey,
      ),
    );

  const coversEveryItem =
    expectedItemKeys.every(
      (
        itemKey,
      ) =>
        resultItemKeys.has(
          itemKey,
        ),
    );

  if (
    !coversEveryItem
  ) {
    return null;
  }

  /*
   * Protección adicional:
   * todos los precios elegidos deben
   * pertenecer a una de las tiendas
   * permitidas por la combinación.
   */
  const allPricesBelongToCombination =
    resultItems.every(
      (
        item,
      ) =>
        allowedKeys.has(
          createStoreKey(
            item.storeId,
            item.branch,
          ),
        ),
    );

  if (
    !allPricesBelongToCombination
  ) {
    return null;
  }

  const total =
    resultItems.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        item.subtotal,
      0,
    );

  const groupedStores =
    groupSmartItemsByStore(
      resultItems,
    );

  /*
   * Si por cualquier razón no quedó
   * ninguna tienda utilizada,
   * la combinación tampoco es válida.
   */
  if (
    groupedStores.length ===
    0
  ) {
    return null;
  }

  return {
    total:
      Number(
        total.toFixed(
          2,
        ),
      ),

    items:
      resultItems,

    stores:
      groupedStores,
  };
}

/*
 * ==========================================
 * CALCULAR COMPRA EQUILIBRADA
 * ==========================================
 *
 * Busca el MENOR número de tiendas
 * capaz de cubrir toda la lista.
 *
 * Dentro de ese número de tiendas,
 * elige la combinación más barata.
 */

export function calculateBalancedPurchase(
  items: ShoppingListItem[],
  smartPurchase:
    SmartPurchaseResult,
): BalancedPurchaseResult {
  /*
   * ========================================
   * LISTA VACÍA
   * ========================================
   */
  if (
    items.length ===
    0
  ) {
    return {
      found:
        false,

      complete:
        false,

      total:
        0,

      storeCount:
        0,

      storesSavedVsSmart:
        0,

      extraCostVsSmart:
        0,

      items:
        [],

      stores:
        [],

      message:
        "Agrega productos para calcular una compra equilibrada.",
    };
  }

  /*
   * ========================================
   * VALIDAR SMART PURCHASE
   * ========================================
   *
   * Smart Purchase debe tener 100%
   * de cobertura antes de intentar
   * optimizar el número de tiendas.
   */
  const smartPurchaseReallyComplete =
    smartPurchase.complete &&
    smartPurchase.items.length ===
      items.length &&
    smartPurchase.missingItems ===
      0;

  if (
    !smartPurchaseReallyComplete
  ) {
    return {
      found:
        false,

      complete:
        false,

      total:
        smartPurchase.total,

      storeCount:
        smartPurchase.storeCount,

      storesSavedVsSmart:
        0,

      extraCostVsSmart:
        0,

      items:
        smartPurchase.items,

      stores:
        smartPurchase.stores,

      message:
        "Todavía faltan precios para completar toda tu lista.",
    };
  }

  const availableStores =
    getAvailableStores(
      items,
    );

  if (
    availableStores.length ===
    0
  ) {
    return {
      found:
        false,

      complete:
        false,

      total:
        smartPurchase.total,

      storeCount:
        0,

      storesSavedVsSmart:
        0,

      extraCostVsSmart:
        0,

      items:
        [],

      stores:
        [],

      message:
        "No encontramos tiendas con precios disponibles para esta lista.",
    };
  }

  /*
   * ========================================
   * LÍMITE DE BÚSQUEDA
   * ========================================
   *
   * Para el MVP buscamos hasta 4 tiendas
   * para evitar demasiadas combinaciones.
   *
   * Nunca necesitamos probar más tiendas
   * de las que ya usa Smart Purchase.
   */
  const MAX_BALANCED_STORES =
    Math.min(
      4,
      smartPurchase.storeCount,
      availableStores.length,
    );

  for (
    let storeCount =
      1;
    storeCount <=
      MAX_BALANCED_STORES;
    storeCount++
  ) {
    const combinations =
      getCombinations(
        availableStores,
        storeCount,
      );

    let bestCombination:
      | {
          total: number;

          items:
            SmartPurchaseItem[];

          stores:
            SmartPurchaseStore[];
        }
      | null = null;

    for (
      const combination
      of combinations
    ) {
      const evaluated =
        evaluateStoreCombination(
          items,
          combination,
        );

      if (!evaluated) {
        continue;
      }

      /*
       * VALIDACIÓN DOBLE:
       * jamás aceptamos una combinación
       * con menos artículos que la lista.
       */
      if (
        evaluated.items.length !==
        items.length
      ) {
        continue;
      }

      if (
        !bestCombination ||
        evaluated.total <
          bestCombination.total
      ) {
        bestCombination =
          evaluated;
      }
    }

    /*
     * En cuanto encontramos una solución,
     * sabemos que este es el menor número
     * de tiendas capaz de cubrir la lista.
     */
    if (bestCombination) {
      const actualStoreCount =
        bestCombination.stores.length;

      /*
       * Seguridad final:
       * si la combinación dice estar completa,
       * debe contener todos los productos.
       */
      const isReallyComplete =
        bestCombination.items.length ===
        items.length &&
        actualStoreCount >
          0;

      if (
        !isReallyComplete
      ) {
        continue;
      }

      const extraCostVsSmart =
        Math.max(
          0,
          bestCombination.total -
            smartPurchase.total,
        );

      const storesSavedVsSmart =
        Math.max(
          0,
          smartPurchase.storeCount -
            actualStoreCount,
        );

      return {
        found:
          true,

        complete:
          true,

        total:
          bestCombination.total,

        storeCount:
          actualStoreCount,

        storesSavedVsSmart,

        extraCostVsSmart:
          Number(
            extraCostVsSmart.toFixed(
              2,
            ),
          ),

        items:
          bestCombination.items,

        stores:
          bestCombination.stores,

        message:
          storesSavedVsSmart >
          0
            ? `Puedes completar toda tu lista visitando ${actualStoreCount} tienda${
                actualStoreCount ===
                1
                  ? ""
                  : "s"
              } y pagando solo $${extraCostVsSmart.toFixed(
                2,
              )} más que el mínimo absoluto.`
            : `La Compra Inteligente ya utiliza el menor número de tiendas posible: ${actualStoreCount}.`,
      };
    }
  }

  /*
   * ========================================
   * RESPALDO
   * ========================================
   *
   * Si no encontramos una combinación
   * mejor dentro del límite de búsqueda,
   * conservamos Smart Purchase.
   */
  return {
    found:
      true,

    complete:
      true,

    total:
      smartPurchase.total,

    storeCount:
      smartPurchase.storeCount,

    storesSavedVsSmart:
      0,

    extraCostVsSmart:
      0,

    items:
      smartPurchase.items,

    stores:
      smartPurchase.stores,

    message:
      `Por ahora la mejor cobertura completa requiere ${smartPurchase.storeCount} tienda${
        smartPurchase.storeCount ===
        1
          ? ""
          : "s"
      }.`,
  };
}

/*
 * ==========================================
 * CALCULAR RECOMENDACIÓN LISTIK
 * ==========================================
 */

export function calculateListikRecommendation(
  totals: StoreTotal[],
  smartPurchase: SmartPurchaseResult,
): ListikRecommendation {
  const completeStores =
    totals.filter(
      (
        store,
      ) =>
        store.complete,
    );

  const bestSingleStore =
    completeStores[0] ??
    null;

  /*
   * ========================================
   * NO HAY UNA SOLA TIENDA COMPLETA
   * ========================================
   */

  if (!bestSingleStore) {
    const extraStores =
      Math.max(
        0,
        smartPurchase.storeCount -
          1,
      );

    if (
      smartPurchase.complete
    ) {
      return {
        hasCompleteStore:
          false,

        bestSingleStore:
          null,

        smartPurchase,

        singleStoreTotal:
          null,

        smartTotal:
          smartPurchase.total,

        savings:
          null,

        extraStores,

        recommendation:
          "no-complete-store",

        message:
          `Ninguna tienda tiene toda tu lista, pero Compra Inteligente encontró los ${smartPurchase.requestedItems} productos repartidos entre ${smartPurchase.storeCount} tienda${
            smartPurchase.storeCount ===
            1
              ? ""
              : "s"
          }.`,
      };
    }

    return {
      hasCompleteStore:
        false,

      bestSingleStore:
        null,

      smartPurchase,

      singleStoreTotal:
        null,

      smartTotal:
        smartPurchase.total,

      savings:
        null,

      extraStores,

      recommendation:
        "no-complete-store",

      message:
        `Todavía faltan ${smartPurchase.missingItems} producto${
          smartPurchase.missingItems ===
          1
            ? ""
            : "s"
        } para completar tu lista.`,
    };
  }

  /*
   * ========================================
   * HAY TIENDA COMPLETA
   * ========================================
   */

  const singleStoreTotal =
    bestSingleStore.total;

  const smartTotal =
    smartPurchase.total;

  const savings =
    smartPurchase.complete
      ? Math.max(
          0,
          singleStoreTotal -
            smartTotal,
        )
      : 0;

  const extraStores =
    Math.max(
      0,
      smartPurchase.storeCount -
        1,
    );

  /*
   * Smart Purchase incompleta.
   */

  if (
    !smartPurchase.complete
  ) {
    return {
      hasCompleteStore:
        true,

      bestSingleStore,

      smartPurchase,

      singleStoreTotal,

      smartTotal,

      savings:
        0,

      extraStores,

      recommendation:
        "single-store",

      message:
        `${bestSingleStore.storeName}${
          bestSingleStore.branch
            ? ` - ${bestSingleStore.branch}`
            : ""
        } puede surtir toda tu lista, mientras que Compra Inteligente todavía tiene productos sin precio.`,
    };
  }

  /*
   * Smart Purchase usa una sola tienda.
   */

  if (
    smartPurchase.storeCount <=
    1
  ) {
    return {
      hasCompleteStore:
        true,

      bestSingleStore,

      smartPurchase,

      singleStoreTotal,

      smartTotal,

      savings,

      extraStores:
        0,

      recommendation:
        "single-store",

      message:
        `${bestSingleStore.storeName}${
          bestSingleStore.branch
            ? ` - ${bestSingleStore.branch}`
            : ""
        } ya ofrece una excelente opción para toda tu lista.`,
    };
  }

  /*
   * ========================================
   * REGLA ACTUAL
   * ========================================
   *
   * $20 de ahorro mínimo
   * por cada tienda adicional.
   */

  const minimumUsefulSavings =
    extraStores *
    20;

  if (
    savings >
      0 &&
    savings >=
      minimumUsefulSavings
  ) {
    return {
      hasCompleteStore:
        true,

      bestSingleStore,

      smartPurchase,

      singleStoreTotal,

      smartTotal,

      savings,

      extraStores,

      recommendation:
        "smart-purchase",

      message:
        `Dividiendo tu compra entre ${smartPurchase.storeCount} tiendas ahorrarías aproximadamente $${savings.toFixed(
          2,
        )}.`,
    };
  }

  if (
    savings >
    0
  ) {
    return {
      hasCompleteStore:
        true,

      bestSingleStore,

      smartPurchase,

      singleStoreTotal,

      smartTotal,

      savings,

      extraStores,

      recommendation:
        "single-store",

      message:
        `Compra Inteligente ahorra $${savings.toFixed(
          2,
        )}, pero requiere visitar ${smartPurchase.storeCount} tiendas. Probablemente convenga comprar todo en ${bestSingleStore.storeName}.`,
    };
  }

  return {
    hasCompleteStore:
      true,

    bestSingleStore,

    smartPurchase,

    singleStoreTotal,

    smartTotal,

    savings:
      0,

    extraStores,

    recommendation:
      "single-store",

    message:
      `${bestSingleStore.storeName}${
        bestSingleStore.branch
          ? ` - ${bestSingleStore.branch}`
          : ""
      } es actualmente la mejor opción para tu lista completa.`,
  };
}