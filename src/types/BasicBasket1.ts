export interface BasicBasketPrice {
  priceId: string;
  unitPrice: number;
  requiredPackages: number;
  lineTotal: number;
  observedAt: string | null;
  source: string | null;
  productId: string;
  productName: string;
  presentationId: string | null;
  presentationName: string | null;
  storeId: string;
  storeName: string;
  branchId: string | null;
  branchName: string | null;
}

export interface BasicBasketItemResult {
  id: string;
  canonicalName: string;
  displayName: string;
  referencePresentation: string;
  requiredPackages: number;
  referenceAmount: number | null;
  referenceUnit: string | null;
  matched: boolean;
  bestPrice: BasicBasketPrice | null;
}

export interface BasicBasketStoreSummary {
  branchId: string;
  storeId: string;
  storeName: string;
  branchName: string;
  coveredItems: number;
  totalItems: number;
  coveragePercentage: number;
  basketTotal: number;
}

export interface BasicBasketResponse {
  location: {
    state: string;
    municipality: string;
  };
  totalItems: number;
  matchedItems: number;
  missingItems: number;
  bestCombinationTotal: number;
  items: BasicBasketItemResult[];
  stores: BasicBasketStoreSummary[];
}
