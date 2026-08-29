import {
  supabase,
} from "../lib/supabase";

import type {
  ShoppingListItem,
} from "../hooks/useShoppingList";

import type {
  SmartPurchaseAssignment,
  SmartPurchasePlan,
  SmartPurchaseResult,
  SmartPurchaseSettings,
  SmartPurchaseStore,
  SmartTransportMode,
} from "../types/SmartPurchase";

interface BranchRow {
  id: string;

  store_id:
    | string
    | null;

  name:
    | string
    | null;

  latitude:
    | number
    | string
    | null;

  longitude:
    | number
    | string
    | null;
}

interface PriceOption {
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

function itemKey(
  item:
    ShoppingListItem,
) {
  return `${item.product.id}::${item.presentationId ?? "no-presentation"}`;
}

function toNumber(
  value:
    | string
    | number
    | null,
) {
  const parsed =
    Number(
      value,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function toRadians(
  degrees:
    number,
) {
  return (
    degrees *
    Math.PI
  ) /
    180;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earthRadiusKm =
    6371;

  const deltaLat =
    toRadians(
      lat2 -
        lat1,
    );

  const deltaLng =
    toRadians(
      lng2 -
        lng1,
    );

  const a =
    Math.sin(
      deltaLat /
        2,
    ) **
      2 +
    Math.cos(
      toRadians(
        lat1,
      ),
    ) *
      Math.cos(
        toRadians(
          lat2,
        ),
      ) *
      Math.sin(
        deltaLng /
          2,
      ) **
        2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(
        a,
      ),
      Math.sqrt(
        1 -
          a,
      ),
    );

  return (
    earthRadiusKm *
    c
  );
}

function estimateCostPerKm(
  mode:
    SmartTransportMode,
  gasPrice:
    number,
  carKmPerLiter:
    number,
  motoKmPerLiter:
    number,
) {
  if (
    mode ===
    "car"
  ) {
    return (
      gasPrice /
      Math.max(
        1,
        carKmPerLiter,
      )
    );
  }

  if (
    mode ===
    "moto"
  ) {
    return (
      gasPrice /
      Math.max(
        1,
        motoKmPerLiter,
      )
    );
  }

  return 0;
}

function routeDistanceGreedy(
  userLat:
    number,
  userLng:
    number,
  stores:
    SmartPurchaseStore[],
) {
  if (
    stores.length ===
    0
  ) {
    return 0;
  }

  const remaining =
    [
      ...stores,
    ];

  let currentLat =
    userLat;

  let currentLng =
    userLng;

  let total =
    0;

  while (
    remaining.length >
    0
  ) {
    let nearestIndex =
      0;

    let nearestDistance =
      Number.POSITIVE_INFINITY;

    for (
      let index = 0;
      index <
      remaining.length;
      index++
    ) {
      const candidate =
        remaining[index];

      const distance =
        haversineKm(
          currentLat,
          currentLng,
          candidate.latitude,
          candidate.longitude,
        );

      if (
        distance <
        nearestDistance
      ) {
        nearestDistance =
          distance;

        nearestIndex =
          index;
      }
    }

    const [
      nearest,
    ] =
      remaining.splice(
        nearestIndex,
        1,
      );

    total +=
      nearestDistance;

    currentLat =
      nearest.latitude;

    currentLng =
      nearest.longitude;
  }

  /*
   * Regreso aproximado al punto inicial.
   */
  total +=
    haversineKm(
      currentLat,
      currentLng,
      userLat,
      userLng,
    );

  return total;
}

function combinations<T>(
  values:
    T[],
  maxSize:
    number,
) {
  const result:
    T[][] =
    [];

  function visit(
    start:
      number,
    current:
      T[],
  ) {
    if (
      current.length >
      0
    ) {
      result.push(
        [
          ...current,
        ],
      );
    }

    if (
      current.length >=
      maxSize
    ) {
      return;
    }

    for (
      let index =
        start;
      index <
      values.length;
      index++
    ) {
      current.push(
        values[index],
      );

      visit(
        index +
          1,
        current,
      );

      current.pop();
    }
  }

  visit(
    0,
    [],
  );

  return result;
}

async function loadBranches(
  branchIds:
    string[],
) {
  if (
    branchIds.length ===
    0
  ) {
    return [];
  }

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
        latitude,
        longitude
      `)
      .in(
        "id",
        branchIds,
      );

  if (
    error
  ) {
    throw new Error(
      `No se pudieron consultar las coordenadas de las sucursales: ${error.message}`,
    );
  }

  return (
    data ??
    []
  ) as BranchRow[];
}

function createPlan(
  type:
    SmartPurchasePlan["type"],
  label:
    string,
  selectedBranchIds:
    string[],
  optionsByItem:
    Map<
      string,
      PriceOption[]
    >,
  itemMap:
    Map<
      string,
      ShoppingListItem
    >,
  branchMap:
    Map<
      string,
      SmartPurchaseStore
    >,
  settings:
    SmartPurchaseSettings,
): SmartPurchasePlan | null {
  const selected =
    new Set(
      selectedBranchIds,
    );

  const assignments:
    SmartPurchaseAssignment[] =
    [];

  let productsTotal =
    0;

  for (
    const [
      key,
      options,
    ]
    of optionsByItem
  ) {
    const best =
      options
        .filter(
          (
            option,
          ) =>
            selected.has(
              option.branchId,
            ),
        )
        .sort(
          (
            a,
            b,
          ) =>
            a.lineTotal -
            b.lineTotal,
        )[0];

    if (
      !best
    ) {
      continue;
    }

    const item =
      itemMap.get(
        key,
      );

    if (
      !item
    ) {
      continue;
    }

    productsTotal +=
      best.lineTotal;

    assignments.push({
      itemKey:
        key,

      productId:
        best.productId,

      presentationId:
        best.presentationId,

      productName:
        best.productName,

      presentationName:
        best.presentationName,

      quantity:
        best.quantity,

      branchId:
        best.branchId,

      storeId:
        best.storeId,

      storeName:
        best.storeName,

      branchName:
        best.branchName,

      unitPrice:
        Number(
          best.unitPrice.toFixed(
            2,
          ),
        ),

      lineTotal:
        Number(
          best.lineTotal.toFixed(
            2,
          ),
        ),
    });
  }

  if (
    assignments.length ===
    0
  ) {
    return null;
  }

  const usedBranchIds =
    [
      ...new Set(
        assignments.map(
          (
            assignment,
          ) =>
            assignment.branchId,
        ),
      ),
    ];

  const stores =
    usedBranchIds
      .map(
        (
          branchId,
        ) =>
          branchMap.get(
            branchId,
          ) ??
          null,
      )
      .filter(
        (
          store,
        ): store is SmartPurchaseStore =>
          Boolean(
            store,
          ),
      );

  if (
    stores.length ===
    0
  ) {
    return null;
  }

  const travelDistanceKm =
    routeDistanceGreedy(
      settings.userLat,
      settings.userLng,
      stores,
    );

  const travelCost =
    travelDistanceKm *
    estimateCostPerKm(
      settings.mode,
      settings.gasPrice,
      settings.carKmPerLiter,
      settings.motoKmPerLiter,
    );

  const coveredItems =
    assignments.length;

  const totalItems =
    itemMap.size;

  return {
    type,

    label,

    coveredItems,

    totalItems,

    coveragePercentage:
      totalItems >
      0
        ? Math.round(
            (
              coveredItems /
              totalItems
            ) *
              100,
          )
        : 0,

    productsTotal:
      Number(
        productsTotal.toFixed(
          2,
        ),
      ),

    travelDistanceKm:
      Number(
        travelDistanceKm.toFixed(
          2,
        ),
      ),

    travelCost:
      Number(
        travelCost.toFixed(
          2,
        ),
      ),

    estimatedTotal:
      Number(
        (
          productsTotal +
          travelCost
        ).toFixed(
          2,
        ),
      ),

    storesCount:
      stores.length,

    stores:
      stores
        .sort(
          (
            a,
            b,
          ) =>
            a.distanceFromUserKm -
            b.distanceFromUserKm,
        ),

    itemAssignments:
      assignments,
  };
}

export async function optimizeShoppingList(
  items:
    ShoppingListItem[],
  settings:
    SmartPurchaseSettings,
): Promise<
  SmartPurchaseResult
> {
  const activeItems =
    items.filter(
      (
        item,
      ) =>
        item.isActive &&
        item.quantity >
          0,
    );

  if (
    activeItems.length ===
    0
  ) {
    return {
      available:
        false,

      reason:
        "Tu lista está vacía.",

      mode:
        settings.mode,

      maxStores:
        settings.maxStores,

      maxDistanceKm:
        settings.maxDistanceKm,

      recommended:
        null,

      singleStore:
        null,

      minimumPrice:
        null,

      savingsVsSingle:
        null,

      distanceNote:
        "La distancia es aproximada.",
    };
  }

  const itemMap =
    new Map<
      string,
      ShoppingListItem
    >();

  const allBranchIds =
    new Set<
      string
    >();

  const rawOptions =
    new Map<
      string,
      PriceOption[]
    >();

  for (
    const item
    of activeItems
  ) {
    const key =
      itemKey(
        item,
      );

    itemMap.set(
      key,
      item,
    );

    const options:
      PriceOption[] =
      [];

    for (
      const price
      of item.prices
    ) {
      if (
        !price.storeBranchId
      ) {
        continue;
      }

      const unitPrice =
        Number(
          price.price,
        );

      if (
        !Number.isFinite(
          unitPrice,
        ) ||
        unitPrice <=
          0
      ) {
        continue;
      }

      allBranchIds.add(
        price.storeBranchId,
      );

      options.push({
        itemKey:
          key,

        productId:
          item.product.id,

        presentationId:
          item.presentationId,

        productName:
          item.product.name,

        presentationName:
          item.presentation?.presentationName ??
          null,

        quantity:
          item.quantity,

        branchId:
          price.storeBranchId,

        storeId:
          price.storeId,

        storeName:
          price.storeName,

        branchName:
          price.branch ??
          price.storeName,

        unitPrice,

        lineTotal:
          unitPrice *
          item.quantity,
      });
    }

    rawOptions.set(
      key,
      options,
    );
  }

  const branches =
    await loadBranches(
      [
        ...allBranchIds,
      ],
    );

  const branchMap =
    new Map<
      string,
      SmartPurchaseStore
    >();

  for (
    const branch
    of branches
  ) {
    const latitude =
      toNumber(
        branch.latitude,
      );

    const longitude =
      toNumber(
        branch.longitude,
      );

    if (
      latitude ===
        null ||
      longitude ===
        null
    ) {
      continue;
    }

    const distanceFromUserKm =
      haversineKm(
        settings.userLat,
        settings.userLng,
        latitude,
        longitude,
      );

    if (
      distanceFromUserKm >
      settings.maxDistanceKm
    ) {
      continue;
    }

    /*
     * Tomamos el nombre/cadena del primer
     * precio disponible de esta sucursal.
     */
    let storeId =
      String(
        branch.store_id ??
        "",
      );

    let storeName =
      branch.name ??
      "Tienda";

    let branchName =
      branch.name ??
      "Sucursal";

    for (
      const options
      of rawOptions.values()
    ) {
      const option =
        options.find(
          (
            candidate,
          ) =>
            candidate.branchId ===
            branch.id,
        );

      if (
        option
      ) {
        storeId =
          option.storeId;

        storeName =
          option.storeName;

        branchName =
          option.branchName;

        break;
      }
    }

    branchMap.set(
      branch.id,
      {
        branchId:
          branch.id,

        storeId,

        storeName,

        branchName,

        latitude,

        longitude,

        distanceFromUserKm:
          Number(
            distanceFromUserKm.toFixed(
              2,
            ),
          ),
      },
    );
  }

  /*
   * Dejamos únicamente opciones dentro
   * del radio elegido.
   */
  const optionsByItem =
    new Map<
      string,
      PriceOption[]
    >();

  for (
    const [
      key,
      options,
    ]
    of rawOptions
  ) {
    optionsByItem.set(
      key,
      options.filter(
        (
          option,
        ) =>
          branchMap.has(
            option.branchId,
          ),
      ),
    );
  }

  const branchCoverage =
    new Map<
      string,
      {
        items:
          Set<string>;
        total:
          number;
      }
    >();

  for (
    const [
      key,
      options,
    ]
    of optionsByItem
  ) {
    for (
      const option
      of options
    ) {
      const current =
        branchCoverage.get(
          option.branchId,
        ) ?? {
          items:
            new Set<
              string
            >(),

          total:
            0,
        };

      current.items.add(
        key,
      );

      current.total +=
        option.lineTotal;

      branchCoverage.set(
        option.branchId,
        current,
      );
    }
  }

  /*
   * Nos quedamos con las 12 sucursales
   * más útiles. Así probar combinaciones
   * de 1, 2 o 3 tiendas sigue siendo rápido.
   */
  const candidateBranchIds =
    [
      ...branchCoverage.entries(),
    ]
      .sort(
        (
          a,
          b,
        ) => {
          if (
            b[1].items.size !==
            a[1].items.size
          ) {
            return (
              b[1].items.size -
              a[1].items.size
            );
          }

          return (
            a[1].total -
            b[1].total
          );
        },
      )
      .slice(
        0,
        12,
      )
      .map(
        (
          [
            branchId,
          ],
        ) =>
          branchId,
      );

  if (
    candidateBranchIds.length ===
    0
  ) {
    return {
      available:
        false,

      reason:
        "No encontramos sucursales con coordenadas y precios dentro del radio seleccionado.",

      mode:
        settings.mode,

      maxStores:
        settings.maxStores,

      maxDistanceKm:
        settings.maxDistanceKm,

      recommended:
        null,

      singleStore:
        null,

      minimumPrice:
        null,

      savingsVsSingle:
        null,

      distanceNote:
        "La distancia es aproximada en línea recta; todavía no representa la ruta real por calles.",
    };
  }

  const plans =
    combinations(
      candidateBranchIds,
      settings.maxStores,
    )
      .map(
        (
          branchIds,
        ) =>
          createPlan(
            "recommended",
            "Mejor compra real",
            branchIds,
            optionsByItem,
            itemMap,
            branchMap,
            settings,
          ),
      )
      .filter(
        (
          plan,
        ): plan is SmartPurchasePlan =>
          Boolean(
            plan,
          ),
      )
      .sort(
        (
          a,
          b,
        ) => {
          /*
           * 1. Mayor cobertura.
           * 2. Menor costo productos + traslado.
           * 3. Menor número de tiendas.
           */
          if (
            b.coveredItems !==
            a.coveredItems
          ) {
            return (
              b.coveredItems -
              a.coveredItems
            );
          }

          if (
            a.estimatedTotal !==
            b.estimatedTotal
          ) {
            return (
              a.estimatedTotal -
              b.estimatedTotal
            );
          }

          return (
            a.storesCount -
            b.storesCount
          );
        },
      );

  const recommended =
    plans[0] ??
    null;

  const singleStore =
    candidateBranchIds
      .map(
        (
          branchId,
        ) =>
          createPlan(
            "single_store",
            "Una sola tienda",
            [
              branchId,
            ],
            optionsByItem,
            itemMap,
            branchMap,
            settings,
          ),
      )
      .filter(
        (
          plan,
        ): plan is SmartPurchasePlan =>
          Boolean(
            plan,
          ),
      )
      .sort(
        (
          a,
          b,
        ) => {
          if (
            b.coveredItems !==
            a.coveredItems
          ) {
            return (
              b.coveredItems -
              a.coveredItems
            );
          }

          return (
            a.estimatedTotal -
            b.estimatedTotal
          );
        },
      )[0] ??
    null;

  /*
   * Precio mínimo:
   * cada artículo en su sucursal más barata
   * dentro del radio, aunque implique más
   * establecimientos.
   */
  const minimumBranches =
    new Set<
      string
    >();

  for (
    const options
    of optionsByItem.values()
  ) {
    const best =
      [
        ...options,
      ].sort(
        (
          a,
          b,
        ) =>
          a.lineTotal -
          b.lineTotal,
      )[0];

    if (
      best
    ) {
      minimumBranches.add(
        best.branchId,
      );
    }
  }

  const minimumPrice =
    minimumBranches.size >
    0
      ? createPlan(
          "minimum_price",
          "Precio mínimo",
          [
            ...minimumBranches,
          ],
          optionsByItem,
          itemMap,
          branchMap,
          settings,
        )
      : null;

  const savingsVsSingle =
    recommended &&
    singleStore &&
    recommended.coveredItems ===
      singleStore.coveredItems
      ? Number(
          (
            singleStore.estimatedTotal -
            recommended.estimatedTotal
          ).toFixed(
            2,
          ),
        )
      : null;

  return {
    available:
      Boolean(
        recommended,
      ),

    reason:
      recommended
        ? null
        : "No fue posible construir una compra inteligente con las opciones actuales.",

    mode:
      settings.mode,

    maxStores:
      settings.maxStores,

    maxDistanceKm:
      settings.maxDistanceKm,

    recommended,

    singleStore,

    minimumPrice,

    savingsVsSingle,

    distanceNote:
      "La distancia es aproximada en línea recta. En una siguiente versión podemos calcular rutas reales por calles.",
  };
}
