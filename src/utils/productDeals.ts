export interface DealPrice {
  price: number;
  stores?: unknown;
}

export interface DealProduct {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  barcode?: string | null;
  prices?: DealPrice[];
}

export interface ProductDeal {
  product: DealProduct;
  bestPrice: number;
  highestPrice: number;
  saving: number;
  savingPercentage: number;
}

export function calculateProductDeal(
  product: DealProduct
): ProductDeal | null {
  if (!product.prices || product.prices.length < 2) {
    return null;
  }

  const prices = product.prices
    .map((item) => Number(item.price))
    .filter(
      (price) =>
        Number.isFinite(price) &&
        price > 0
    );

  if (prices.length < 2) {
    return null;
  }

  const bestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);

  const saving =
    highestPrice - bestPrice;

  if (saving <= 0) {
    return null;
  }

  const savingPercentage =
    highestPrice > 0
      ? (saving / highestPrice) * 100
      : 0;

  return {
    product,
    bestPrice,
    highestPrice,
    saving,
    savingPercentage,
  };
}

export function getBestDeals<
  T extends DealProduct
>(
  products: T[],
  limit = 6
) {
  return products
    .map((product) =>
      calculateProductDeal(product)
    )
    .filter(
      (
        deal
      ): deal is ProductDeal =>
        deal !== null
    )
    .sort(
      (a, b) =>
        b.saving - a.saving
    )
    .slice(0, limit);
}