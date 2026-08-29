export type TransportMode =
  | "car"
  | "moto"
  | "bike"
  | "walk";

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

export interface SmartPurchaseStore {
  branchId: string;
  storeId: string;
  storeName: string;
  branchName: string;
  latitude: number;
  longitude: number;
  distanceFromUserKm: number;
}

export interface SmartPurchaseAssignment {
  basketItemId: string;
  displayName: string;
  branchId: string;
  storeName: string;
  branchName: string;
  lineTotal: number;
}

export interface SmartPurchasePlan {
  type:
    | "recommended"
    | "single_store"
    | "minimum_price";
  label: string;
  coveredItems: number;
  totalItems: number;
  coveragePercentage: number;
  productsTotal: number;
  travelDistanceKm: number;
  travelCost: number;
  estimatedTotal: number;
  storesCount: number;
  stores: SmartPurchaseStore[];
  itemAssignments: SmartPurchaseAssignment[];
}

export interface SmartPurchaseResult {
  available: boolean;
  reason: string | null;
  method: "haversine";
  distanceNote?: string;
  mode: TransportMode;
  maxStores: number;
  maxDistanceKm: number;
  gasPrice?: number;
  carKmPerLiter?: number;
  motoKmPerLiter?: number;
  costPerKm?: number;
  recommended: SmartPurchasePlan | null;
  singleStore: SmartPurchasePlan | null;
  minimumPrice: SmartPurchasePlan | null;
  savingsVsSingle: number | null;
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
  smartPurchase: SmartPurchaseResult | null;
}

export interface BasicBasketRequestOptions {
  userLat?: number;
  userLng?: number;
  mode?: TransportMode;
  maxStores?: 1 | 2 | 3;
  maxDistanceKm?: number;
  gasPrice?: number;
  carKmPerLiter?: number;
  motoKmPerLiter?: number;
}
