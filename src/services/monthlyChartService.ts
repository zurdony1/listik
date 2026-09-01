import { getExpenseHistory } from "./expenseHistoryService";
import { getSmallExpenses } from "./smallExpenseService";

export interface MonthlyPoint {
  month: string;
  supermarket: number;
  smallExpenses: number;
  total: number;
}

export async function getLast6Months(userId: string): Promise<MonthlyPoint[]> {
  const purchases = await getExpenseHistory(userId);
  const today = new Date();
  const points: MonthlyPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const start = new Date(y, m, 1).toISOString().slice(0,10);
    const end = new Date(y, m+1, 0).toISOString().slice(0,10);
    const ants = await getSmallExpenses(start, end);
    const supermarket =
  purchases
    .filter((purchase) => {
      const dateValue =
        purchase.completedAt ??
        purchase.ticketScannedAt ??
        purchase.startedAt;

      if (!dateValue) {
        return false;
      }

      const date =
        new Date(dateValue);

      return (
        date.getFullYear() === y &&
        date.getMonth() === m
      );
    })
    .reduce(
      (sum, purchase) =>
        sum + Number(purchase.total ?? 0),
      0,
    );
    const small = ants.reduce((s,e)=>s+e.amount,0);
    points.push({
      month: d.toLocaleDateString("es-MX",{month:"short"}).replace(".",""),
      supermarket,
      smallExpenses: small,
      total: supermarket+small
    })
  }
  return points
}
