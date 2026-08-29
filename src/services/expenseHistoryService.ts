import {
  supabase,
} from "../lib/supabase";

export interface ExpensePurchase {
  id: string;

  status: string;

  startedAt:
    | string
    | null;

  completedAt:
    | string
    | null;

  ticketScannedAt:
    | string
    | null;

  total:
    number;

  expectedTotal:
    | number
    | null;

  storeBranchId:
    | string
    | null;

  storeName:
    | string
    | null;

  branchName:
    | string
    | null;
}

export interface StoreExpenseSummary {
  storeName: string;

  total: number;

  purchases: number;
}

export interface MonthlyExpenseReport {
  year: number;

  month: number;

  totalSpent: number;

  purchases: number;

  averageTicket: number;

  topStore:
    | StoreExpenseSummary
    | null;

  stores:
    StoreExpenseSummary[];

  previousMonthTotal:
    number;

  changeAmount:
    number;

  changePercentage:
    | number
    | null;
}

function toNumber(
  value:
    unknown,
): number | null {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return null;
  }

  const numberValue =
    Number(
      value,
    );

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : null;
}

function getPurchaseTotal(
  row: {
    ticket_total:
      unknown;

    actual_total:
      unknown;

    expected_total:
      unknown;
  },
) {
  /*
   * Prioridad:
   *
   * 1. ticket_total = gasto real comprobado.
   * 2. actual_total = compra completada sin ticket.
   * 3. expected_total = último respaldo para
   *    compras antiguas de desarrollo.
   */
  return (
    toNumber(
      row.ticket_total,
    ) ??
    toNumber(
      row.actual_total,
    ) ??
    toNumber(
      row.expected_total,
    ) ??
    0
  );
}

export async function getExpenseHistory(
  userId: string,
): Promise<
  ExpensePurchase[]
> {
  const {
    data:
      trips,
    error:
      tripsError,
  } =
    await supabase
      .from(
        "shopping_trips",
      )
      .select(`
        id,
        status,
        started_at,
        completed_at,
        ticket_scanned_at,
        ticket_total,
        actual_total,
        expected_total,
        store_branch_id
      `)
      .eq(
        "user_id",
        userId,
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

  if (
    tripsError
  ) {
    throw new Error(
      `No se pudo cargar tu historial: ${tripsError.message}`,
    );
  }

  const rows =
    trips ??
    [];

  const branchIds =
    [
      ...new Set(
        rows
          .map(
            (
              row,
            ) =>
              row.store_branch_id
                ? String(
                    row.store_branch_id,
                  )
                : null,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(
                value,
              ),
          ),
      ),
    ];

  const branchMap =
    new Map<
      string,
      {
        name:
          string | null;

        storeId:
          string | null;
      }
    >();

  if (
    branchIds.length >
      0
  ) {
    const {
      data:
        branches,
      error:
        branchesError,
    } =
      await supabase
        .from(
          "store_branches",
        )
        .select(`
          id,
          store_id,
          name
        `)
        .in(
          "id",
          branchIds,
        );

    if (
      branchesError
    ) {
      throw new Error(
        `No se pudieron cargar las sucursales: ${branchesError.message}`,
      );
    }

    for (
      const branch
      of branches ??
        []
    ) {
      branchMap.set(
        String(
          branch.id,
        ),
        {
          name:
            branch.name ??
            null,

          storeId:
            branch.store_id
              ? String(
                  branch.store_id,
                )
              : null,
        },
      );
    }
  }

  const storeIds =
    [
      ...new Set(
        [
          ...branchMap.values(),
        ]
          .map(
            (
              branch,
            ) =>
              branch.storeId,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(
                value,
              ),
          ),
      ),
    ];

  const storeMap =
    new Map<
      string,
      string
    >();

  if (
    storeIds.length >
      0
  ) {
    const {
      data:
        stores,
      error:
        storesError,
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
      storesError
    ) {
      throw new Error(
        `No se pudieron cargar las tiendas: ${storesError.message}`,
      );
    }

    for (
      const store
      of stores ??
        []
    ) {
      storeMap.set(
        String(
          store.id,
        ),
        String(
          store.name ??
            "Tienda",
        ),
      );
    }
  }

  return rows.map(
    (
      row,
    ) => {
      const branchId =
        row.store_branch_id
          ? String(
              row.store_branch_id,
            )
          : null;

      const branch =
        branchId
          ? branchMap.get(
              branchId,
            )
          : null;

      return {
        id:
          String(
            row.id,
          ),

        status:
          String(
            row.status ??
              "completed",
          ),

        startedAt:
          row.started_at ??
          null,

        completedAt:
          row.completed_at ??
          null,

        ticketScannedAt:
          row.ticket_scanned_at ??
          null,

        total:
          getPurchaseTotal(
            row,
          ),

        expectedTotal:
          toNumber(
            row.expected_total,
          ),

        storeBranchId:
          branchId,

        storeName:
          branch?.storeId
            ? storeMap.get(
                branch.storeId,
              ) ??
              null
            : null,

        branchName:
          branch?.name ??
          null,
      };
    },
  );
}

function sameMonth(
  value:
    | string
    | null,
  year: number,
  month: number,
) {
  if (
    !value
  ) {
    return false;
  }

  const date =
    new Date(
      value,
    );

  return (
    date.getFullYear() ===
      year &&
    date.getMonth() ===
      month
  );
}

export function getMonthPurchases(
  items:
    ExpensePurchase[],
  year: number,
  month: number,
) {
  return items.filter(
    (
      item,
    ) =>
      sameMonth(
        item.completedAt ??
          item.ticketScannedAt ??
          item.startedAt,
        year,
        month,
      ),
  );
}

function summarizeStores(
  items:
    ExpensePurchase[],
) {
  const map =
    new Map<
      string,
      StoreExpenseSummary
    >();

  for (
    const item
    of items
  ) {
    const storeName =
      item.storeName ??
      "Tienda sin identificar";

    const current =
      map.get(
        storeName,
      ) ?? {
        storeName,

        total:
          0,

        purchases:
          0,
      };

    current.total +=
      item.total;

    current.purchases +=
      1;

    map.set(
      storeName,
      current,
    );
  }

  return [
    ...map.values(),
  ].sort(
    (
      a,
      b,
    ) =>
      b.total -
      a.total,
  );
}

export function buildMonthlyExpenseReport(
  items:
    ExpensePurchase[],
  year: number,
  month: number,
): MonthlyExpenseReport {
  const current =
    getMonthPurchases(
      items,
      year,
      month,
    );

  const previousDate =
    new Date(
      year,
      month -
        1,
      1,
    );

  const previous =
    getMonthPurchases(
      items,
      previousDate.getFullYear(),
      previousDate.getMonth(),
    );

  const totalSpent =
    current.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.total,
      0,
    );

  const previousMonthTotal =
    previous.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.total,
      0,
    );

  const purchases =
    current.length;

  const averageTicket =
    purchases >
      0
      ? totalSpent /
        purchases
      : 0;

  const stores =
    summarizeStores(
      current,
    );

  const changeAmount =
    totalSpent -
    previousMonthTotal;

  const changePercentage =
    previousMonthTotal >
      0
      ? (
          changeAmount /
          previousMonthTotal
        ) *
        100
      : null;

  return {
    year,

    month,

    totalSpent,

    purchases,

    averageTicket,

    topStore:
      stores[0] ??
      null,

    stores,

    previousMonthTotal,

    changeAmount,

    changePercentage,
  };
}
