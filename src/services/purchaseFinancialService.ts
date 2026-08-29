export interface PurchaseFinancialInput {
  status:
    string;

  expectedTotal:
    | number
    | null;

  actualTotal:
    | number
    | null;

  savingsAmount:
    | number
    | null;

  ticketTotal:
    | number
    | null;

  ticketListTotal:
    | number
    | null;

  ticketOutsideListTotal:
    | number
    | null;

  ticketScannedAt:
    | string
    | null;

  ticketMatchedItems:
    | number
    | null;

  ticketPlannedItems:
    | number
    | null;

  ticketMatchedUnits:
    | number
    | null;

  ticketPlannedUnits:
    | number
    | null;
}

export type PurchaseComparisonStatus =
  | "confirmed"
  | "estimated"
  | "partial"
  | "missing"
  | "inconsistent";

export interface PurchaseFinancialSnapshot {
  comparisonStatus:
    PurchaseComparisonStatus;

  hasTicket:
    boolean;

  ticketCoverageComplete:
    boolean;

  ticketArithmeticConsistent:
    boolean;

  expectedTotal:
    number | null;

  realListTotal:
    number | null;

  ticketTotal:
    number | null;

  outsideListTotal:
    number | null;

  difference:
    number | null;

  savings:
    number | null;

  overBudget:
    number | null;

  canUseForConfirmedSavings:
    boolean;

  reason:
    string | null;
}

function validMoney(
  value:
    number | null,
) {
  return (
    value !==
      null &&
    Number.isFinite(
      value,
    ) &&
    value >=
      0
  );
}

function moneyTolerance(
  total:
    number,
) {
  return Math.max(
    1,
    Math.abs(
      total,
    ) *
      0.01,
  );
}

function checkTicketArithmetic(
  ticketTotal:
    number | null,
  listTotal:
    number | null,
  outsideTotal:
    number | null,
) {
  if (
    !validMoney(
      ticketTotal,
    ) ||
    !validMoney(
      listTotal,
    )
  ) {
    return true;
  }

  const tolerance =
    moneyTolerance(
      ticketTotal as number,
    );

  if (
    (
      listTotal as number
    ) >
    (
      ticketTotal as number
    ) +
      tolerance
  ) {
    return false;
  }

  if (
    validMoney(
      outsideTotal,
    )
  ) {
    const reconstructed =
      (
        listTotal as number
      ) +
      (
        outsideTotal as number
      );

    return (
      Math.abs(
        reconstructed -
          (
            ticketTotal as number
          ),
      ) <=
      tolerance
    );
  }

  return true;
}

export function getPurchaseFinancialSnapshot(
  input:
    PurchaseFinancialInput,
): PurchaseFinancialSnapshot {
  const hasTicket =
    Boolean(
      input.ticketScannedAt,
    );

  const productsCoverageComplete =
    (
      input.ticketPlannedItems ??
      0
    ) >
      0 &&
    input.ticketMatchedItems !==
      null &&
    input.ticketMatchedItems ===
      input.ticketPlannedItems;

  const unitsCoverageComplete =
    (
      input.ticketPlannedUnits ??
      0
    ) >
      0 &&
    input.ticketMatchedUnits !==
      null &&
    input.ticketMatchedUnits ===
      input.ticketPlannedUnits;

  const ticketCoverageComplete =
    hasTicket &&
    productsCoverageComplete &&
    unitsCoverageComplete &&
    validMoney(
      input.ticketListTotal,
    );

  const ticketArithmeticConsistent =
    checkTicketArithmetic(
      input.ticketTotal,
      input.ticketListTotal,
      input.ticketOutsideListTotal,
    );

  let comparisonStatus:
    PurchaseComparisonStatus =
      "missing";

  let realListTotal:
    number | null =
      null;

  let reason:
    string | null =
      null;

  if (
    hasTicket
  ) {
    if (
      !ticketCoverageComplete
    ) {
      comparisonStatus =
        "partial";

      reason =
        "El ticket todavía no tiene todos los productos y unidades planeados conciliados.";
    } else if (
      !ticketArithmeticConsistent
    ) {
      comparisonStatus =
        "inconsistent";

      reason =
        "Los totales del ticket no cuadran entre lista, extras y total completo.";
    } else {
      comparisonStatus =
        "confirmed";

      realListTotal =
        input.ticketListTotal;
    }
  } else if (
    input.status ===
      "completed" &&
    validMoney(
      input.actualTotal,
    )
  ) {
    comparisonStatus =
      "estimated";

    realListTotal =
      input.actualTotal;

    reason =
      "Compra terminada sin ticket conciliado; el gasto proviene del modo compra.";
  }

  const expectedTotal =
    validMoney(
      input.expectedTotal,
    )
      ? input.expectedTotal
      : null;

  const difference =
    expectedTotal !==
      null &&
    realListTotal !==
      null
      ? Number(
          (
            expectedTotal -
            realListTotal
          ).toFixed(
            2,
          ),
        )
      : null;

  const savings =
    difference !==
      null &&
    difference >
      0
      ? difference
      : difference ===
          0
        ? 0
        : null;

  const overBudget =
    difference !==
      null &&
    difference <
      0
      ? Math.abs(
          difference,
        )
      : difference ===
          0
        ? 0
        : null;

  return {
    comparisonStatus,

    hasTicket,

    ticketCoverageComplete,

    ticketArithmeticConsistent,

    expectedTotal,

    realListTotal,

    ticketTotal:
      validMoney(
        input.ticketTotal,
      )
        ? input.ticketTotal
        : null,

    outsideListTotal:
      validMoney(
        input.ticketOutsideListTotal,
      )
        ? input.ticketOutsideListTotal
        : null,

    difference,

    savings,

    overBudget,

    canUseForConfirmedSavings:
      comparisonStatus ===
      "confirmed",

    reason,
  };
}
