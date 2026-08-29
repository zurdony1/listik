import {
  supabase,
} from "../lib/supabase";

import {
  getPurchaseFinancialSnapshot,
  type PurchaseFinancialSnapshot,
} from "./purchaseFinancialService";

export interface PurchaseHistoryItem {
  id: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  storeBranchId: string | null;
  storeName: string | null;
  branchName: string | null;
  expectedTotal: number | null;
  actualTotal: number | null;
  savingsAmount: number | null;
  ticketTotal: number | null;
  ticketListTotal: number | null;
  ticketOutsideListTotal: number | null;
  ticketScannedAt: string | null;
  ticketMatchedItems: number | null;
  ticketPlannedItems: number | null;
  ticketMatchedUnits: number | null;
  ticketPlannedUnits: number | null;

  financial:
    PurchaseFinancialSnapshot;
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

  const result =
    Number(
      value,
    );

  return Number.isFinite(
    result,
  )
    ? result
    : null;
}

export async function getPurchaseHistory(
  userId:
    string,
): Promise<
  PurchaseHistoryItem[]
> {
  const {
    data:
      trips,
    error:
      tripError,
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
        store_branch_id,
        expected_total,
        actual_total,
        savings_amount,
        ticket_total,
        ticket_scanned_at,
        ticket_list_total,
        ticket_outside_list_total,
        ticket_matched_items,
        ticket_planned_items,
        ticket_matched_units,
        ticket_planned_units
      `)
      .eq(
        "user_id",
        userId,
      )
      .order(
        "started_at",
        {
          ascending:
            false,
        },
      );

  if (
    tripError
  ) {
    throw new Error(
      `No se pudo cargar tu historial: ${tripError.message}`,
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
    branchIds.length
  ) {
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
          name
        `)
        .in(
          "id",
          branchIds,
        );

    if (
      error
    ) {
      throw new Error(
        `No se pudieron cargar las sucursales: ${error.message}`,
      );
    }

    for (
      const row
      of data ??
        []
    ) {
      branchMap.set(
        String(
          row.id,
        ),
        {
          name:
            row.name ??
            null,

          storeId:
            row.store_id
              ? String(
                  row.store_id,
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
    storeIds.length
  ) {
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
        .in(
          "id",
          storeIds,
        );

    if (
      error
    ) {
      throw new Error(
        `No se pudieron cargar las tiendas: ${error.message}`,
      );
    }

    for (
      const row
      of data ??
        []
    ) {
      storeMap.set(
        String(
          row.id,
        ),
        String(
          row.name ??
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

      const expectedTotal =
        toNumber(
          row.expected_total,
        );

      const actualTotal =
        toNumber(
          row.actual_total,
        );

      const savingsAmount =
        toNumber(
          row.savings_amount,
        );

      const ticketTotal =
        toNumber(
          row.ticket_total,
        );

      const ticketListTotal =
        toNumber(
          row.ticket_list_total,
        );

      const ticketOutsideListTotal =
        toNumber(
          row.ticket_outside_list_total,
        );

      const ticketScannedAt =
        row.ticket_scanned_at ??
        null;

      const ticketMatchedItems =
        row.ticket_matched_items ??
        null;

      const ticketPlannedItems =
        row.ticket_planned_items ??
        null;

      const ticketMatchedUnits =
        row.ticket_matched_units ??
        null;

      const ticketPlannedUnits =
        row.ticket_planned_units ??
        null;

      const financial =
        getPurchaseFinancialSnapshot({
          status:
            String(
              row.status ??
                "unknown",
            ),

          expectedTotal,

          actualTotal,

          savingsAmount,

          ticketTotal,

          ticketListTotal,

          ticketOutsideListTotal,

          ticketScannedAt,

          ticketMatchedItems,

          ticketPlannedItems,

          ticketMatchedUnits,

          ticketPlannedUnits,
        });

      return {
        id:
          String(
            row.id,
          ),

        status:
          String(
            row.status ??
              "unknown",
          ),

        startedAt:
          row.started_at ??
          null,

        completedAt:
          row.completed_at ??
          null,

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

        expectedTotal,

        actualTotal,

        savingsAmount,

        ticketTotal,

        ticketListTotal,

        ticketOutsideListTotal,

        ticketScannedAt,

        ticketMatchedItems,

        ticketPlannedItems,

        ticketMatchedUnits,

        ticketPlannedUnits,

        financial,
      };
    },
  );
}

export function getMonthlySummary(
  items:
    PurchaseHistoryItem[],
) {
  const now =
    new Date();

  const monthItems =
    items.filter(
      (
        item,
      ) => {
        const raw =
          item.completedAt ??
          item.startedAt;

        if (
          !raw
        ) {
          return false;
        }

        const date =
          new Date(
            raw,
          );

        return (
          date.getFullYear() ===
            now.getFullYear() &&
          date.getMonth() ===
            now.getMonth()
        );
      },
    );

  return monthItems.reduce(
    (
      summary,
      item,
    ) => {
      const confirmed =
        item.financial
          .canUseForConfirmedSavings;

      return {
        purchases:
          summary.purchases +
          (
            item.status ===
              "completed"
              ? 1
              : 0
          ),

        tickets:
          summary.tickets +
          (
            item.ticketScannedAt
              ? 1
              : 0
          ),

        reconciledTickets:
          summary.reconciledTickets +
          (
            confirmed
              ? 1
              : 0
          ),

        confirmedListSpend:
          summary.confirmedListSpend +
          (
            confirmed
              ? item.financial
                  .realListTotal ??
                0
              : 0
          ),

        confirmedSavings:
          summary.confirmedSavings +
          (
            confirmed
              ? item.financial
                  .savings ??
                0
              : 0
          ),

        confirmedOverBudget:
          summary.confirmedOverBudget +
          (
            confirmed
              ? item.financial
                  .overBudget ??
                0
              : 0
          ),

        outside:
          summary.outside +
          (
            confirmed
              ? item.financial
                  .outsideListTotal ??
                0
              : 0
          ),

        pendingComparisons:
          summary.pendingComparisons +
          (
            item.financial
              .comparisonStatus ===
              "partial" ||
            item.financial
              .comparisonStatus ===
              "inconsistent"
              ? 1
              : 0
          ),
      };
    },
    {
      purchases:
        0,

      tickets:
        0,

      reconciledTickets:
        0,

      confirmedListSpend:
        0,

      confirmedSavings:
        0,

      confirmedOverBudget:
        0,

      outside:
        0,

      pendingComparisons:
        0,
    },
  );
}
