import {
  supabase,
} from "../lib/supabase";

export interface FrequentlyPurchasedProduct {
  productId: string;
  productName: string;
  brand: string | null;
  category: string | null;
  presentationId: string | null;
  presentationName: string | null;

  totalUnits: number;
  purchaseCount: number;
  lastPurchaseAt: string | null;

  averageActualPrice: number | null;

  marketFirstPrice: number | null;
  marketLatestPrice: number | null;
  marketChangeAmount: number | null;
  marketChangePercentage: number | null;
}

interface TripRow {
  id: string;
  completed_at: string | null;
  ticket_scanned_at: string | null;
  started_at: string | null;
}

interface TripItemRow {
  trip_id: string;
  product_id: string;
  presentation_id: string | null;
  quantity: number | string | null;
  checked: boolean | null;
  actual_price: number | string | null;
}

interface ProductRow {
  id: string;
  name: string | null;
  brand: string | null;
  category: string | null;
}

interface PresentationRow {
  id: string;
  product_id: string;
  presentation_name: string | null;
}

interface PriceRow {
  product_id: string;
  presentation_id: string | null;
  price: number | string;
  observed_at: string | null;
}

function getTripDate(
  trip: TripRow,
) {
  return (
    trip.completed_at ??
    trip.ticket_scanned_at ??
    trip.started_at ??
    null
  );
}

function safeNumber(
  value:
    | number
    | string
    | null
    | undefined,
) {
  const numeric =
    Number(value);

  return Number.isFinite(
    numeric,
  )
    ? numeric
    : 0;
}

function getMonthsAgoIso(
  months: number,
) {
  const now =
    new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth() - months,
    1,
  ).toISOString();
}

export async function getFrequentlyPurchasedProducts(
  limit = 5,
): Promise<FrequentlyPurchasedProduct[]> {
  const {
    data: authData,
    error: authError,
  } =
    await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const user =
    authData.user;

  if (!user) {
    return [];
  }

  /*
   * ==========================================
   * COMPRAS TERMINADAS DEL USUARIO
   * ==========================================
   */

  const {
    data: tripData,
    error: tripError,
  } =
    await supabase
      .from(
        "shopping_trips",
      )
      .select(`
        id,
        completed_at,
        ticket_scanned_at,
        started_at
      `)
      .eq(
        "user_id",
        user.id,
      )
      .eq(
        "status",
        "completed",
      )
      .order(
        "completed_at",
        {
          ascending:
            false,
        },
      );

  if (tripError) {
    throw tripError;
  }

  const trips =
    (
      tripData ??
      []
    ) as TripRow[];

  if (
    trips.length ===
    0
  ) {
    return [];
  }

  const tripIds =
    trips.map(
      (
        trip,
      ) =>
        String(
          trip.id,
        ),
    );

  const tripById =
    new Map<
      string,
      TripRow
    >();

  trips.forEach(
    (
      trip,
    ) => {
      tripById.set(
        String(
          trip.id,
        ),
        trip,
      );
    },
  );

  /*
   * ==========================================
   * PRODUCTOS MARCADOS COMO COMPRADOS
   * ==========================================
   */

  const {
    data: itemData,
    error: itemError,
  } =
    await supabase
      .from(
        "shopping_trip_items",
      )
      .select(`
        trip_id,
        product_id,
        presentation_id,
        quantity,
        checked,
        actual_price
      `)
      .in(
        "trip_id",
        tripIds,
      )
      .eq(
        "checked",
        true,
      );

  if (itemError) {
    throw itemError;
  }

  const tripItems =
    (
      itemData ??
      []
    ) as TripItemRow[];

  if (
    tripItems.length ===
    0
  ) {
    return [];
  }

  const productIds =
    Array.from(
      new Set(
        tripItems.map(
          (
            item,
          ) =>
            String(
              item.product_id,
            ),
        ),
      ),
    );

  const presentationIds =
    Array.from(
      new Set(
        tripItems
          .map(
            (
              item,
            ) =>
              item.presentation_id
                ? String(
                    item.presentation_id,
                  )
                : null,
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(id),
          ),
      ),
    );

  /*
   * ==========================================
   * CATÁLOGO
   * ==========================================
   */

  const {
    data: productData,
    error: productError,
  } =
    await supabase
      .from(
        "products",
      )
      .select(`
        id,
        name,
        brand,
        category
      `)
      .in(
        "id",
        productIds,
      );

  if (productError) {
    throw productError;
  }

  const productById =
    new Map<
      string,
      ProductRow
    >();

  (
    (
      productData ??
      []
    ) as ProductRow[]
  ).forEach(
    (
      product,
    ) => {
      productById.set(
        String(
          product.id,
        ),
        product,
      );
    },
  );

  const presentationById =
    new Map<
      string,
      PresentationRow
    >();

  if (
    presentationIds.length >
    0
  ) {
    const {
      data:
        presentationData,

      error:
        presentationError,
    } =
      await supabase
        .from(
          "product_presentations",
        )
        .select(`
          id,
          product_id,
          presentation_name
        `)
        .in(
          "id",
          presentationIds,
        );

    if (
      presentationError
    ) {
      throw presentationError;
    }

    (
      (
        presentationData ??
        []
      ) as PresentationRow[]
    ).forEach(
      (
        presentation,
      ) => {
        presentationById.set(
          String(
            presentation.id,
          ),
          presentation,
        );
      },
    );
  }

  /*
   * ==========================================
   * AGRUPAR COMPRAS
   * ==========================================
   */

  interface Aggregate {
    productId: string;
    presentationId: string | null;
    totalUnits: number;
    tripIds: Set<string>;
    lastPurchaseAt: string | null;
    actualPrices: number[];
  }

  const aggregates =
    new Map<
      string,
      Aggregate
    >();

  tripItems.forEach(
    (
      item,
    ) => {
      const productId =
        String(
          item.product_id,
        );

      const presentationId =
        item.presentation_id
          ? String(
              item.presentation_id,
            )
          : null;

      const key =
        `${productId}::${
          presentationId ??
          "none"
        }`;

      const current =
        aggregates.get(
          key,
        ) ?? {
          productId,
          presentationId,
          totalUnits:
            0,
          tripIds:
            new Set<
              string
            >(),
          lastPurchaseAt:
            null,
          actualPrices:
            [],
        };

      const quantity =
        Math.max(
          1,
          safeNumber(
            item.quantity,
          ),
        );

      current.totalUnits +=
        quantity;

      current.tripIds.add(
        String(
          item.trip_id,
        ),
      );

      const trip =
        tripById.get(
          String(
            item.trip_id,
          ),
        );

      const tripDate =
        trip
          ? getTripDate(
              trip,
            )
          : null;

      if (
        tripDate &&
        (
          !current.lastPurchaseAt ||
          new Date(
            tripDate,
          ).getTime() >
            new Date(
              current.lastPurchaseAt,
            ).getTime()
        )
      ) {
        current.lastPurchaseAt =
          tripDate;
      }

      if (
        item.actual_price !==
        null
      ) {
        const actualPrice =
          safeNumber(
            item.actual_price,
          );

        if (
          actualPrice >
          0
        ) {
          current.actualPrices.push(
            actualPrice,
          );
        }
      }

      aggregates.set(
        key,
        current,
      );
    },
  );

  const sortedAggregates =
    [
      ...aggregates.values(),
    ].sort(
      (
        a,
        b,
      ) =>
        b.totalUnits -
        a.totalUnits,
    );

  const topAggregates =
    sortedAggregates.slice(
      0,
      Math.max(
        1,
        limit,
      ),
    );

  /*
   * ==========================================
   * HISTORIAL DE PRECIOS DE MERCADO
   * ==========================================
   *
   * No representa necesariamente el precio
   * personal pagado por el usuario.
   *
   * Son observaciones de la tabla prices,
   * incluyendo tickets y otras fuentes.
   */

  const topProductIds =
    Array.from(
      new Set(
        topAggregates.map(
          (
            item,
          ) =>
            item.productId,
        ),
      ),
    );

  const {
    data: priceData,
    error: priceError,
  } =
    await supabase
      .from(
        "prices",
      )
      .select(`
        product_id,
        presentation_id,
        price,
        observed_at
      `)
      .in(
        "product_id",
        topProductIds,
      )
      .gte(
        "observed_at",
        getMonthsAgoIso(
          6,
        ),
      )
      .order(
        "observed_at",
        {
          ascending:
            true,
        },
      );

  if (priceError) {
    throw priceError;
  }

  const prices =
    (
      priceData ??
      []
    ) as PriceRow[];

  return topAggregates.map(
    (
      aggregate,
    ) => {
      const product =
        productById.get(
          aggregate.productId,
        );

      const presentation =
        aggregate.presentationId
          ? presentationById.get(
              aggregate.presentationId,
            )
          : null;

      const matchingPrices =
        prices.filter(
          (
            row,
          ) => {
            if (
              String(
                row.product_id,
              ) !==
              aggregate.productId
            ) {
              return false;
            }

            /*
             * Si conocemos la presentación
             * preferimos comparar la misma.
             *
             * Si no hay presentación en la compra,
             * usamos las observaciones generales
             * del producto.
             */
            if (
              aggregate.presentationId
            ) {
              return (
                row.presentation_id ===
                  aggregate.presentationId ||
                row.presentation_id ===
                  null
              );
            }

            return true;
          },
        );

      const validPrices =
        matchingPrices.filter(
          (
            row,
          ) =>
            safeNumber(
              row.price,
            ) >
            0,
        );

      const firstPrice =
        validPrices.length >
        0
          ? safeNumber(
              validPrices[0]
                .price,
            )
          : null;

      const latestPrice =
        validPrices.length >
        0
          ? safeNumber(
              validPrices[
                validPrices.length -
                  1
              ].price,
            )
          : null;

      const changeAmount =
        firstPrice !==
          null &&
        latestPrice !==
          null
          ? latestPrice -
            firstPrice
          : null;

      const changePercentage =
        firstPrice !==
          null &&
        firstPrice >
          0 &&
        changeAmount !==
          null
          ? (
              changeAmount /
              firstPrice
            ) *
            100
          : null;

      const averageActualPrice =
        aggregate.actualPrices
          .length >
        0
          ? aggregate.actualPrices.reduce(
              (
                sum,
                price,
              ) =>
                sum +
                price,
              0,
            ) /
            aggregate.actualPrices
              .length
          : null;

      return {
        productId:
          aggregate.productId,

        productName:
          product?.name ??
          "Producto",

        brand:
          product?.brand ??
          null,

        category:
          product?.category ??
          null,

        presentationId:
          aggregate.presentationId,

        presentationName:
          presentation
            ?.presentation_name ??
          null,

        totalUnits:
          aggregate.totalUnits,

        purchaseCount:
          aggregate.tripIds
            .size,

        lastPurchaseAt:
          aggregate.lastPurchaseAt,

        averageActualPrice,

        marketFirstPrice:
          firstPrice,

        marketLatestPrice:
          latestPrice,

        marketChangeAmount:
          changeAmount,

        marketChangePercentage:
          changePercentage,
      };
    },
  );
}
