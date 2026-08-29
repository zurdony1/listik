export type SmartTransportMode =
  | "car"
  | "moto"
  | "bike"
  | "walk";

/*
 * ==========================================
 * CONFIGURACIÓN
 * ==========================================
 */

export interface SmartPurchaseSettings {
  userLat: number;

  userLng: number;

  mode:
    SmartTransportMode;

  maxStores:
    1 | 2 | 3;

  maxDistanceKm:
    number;

  gasPrice:
    number;

  carKmPerLiter:
    number;

  motoKmPerLiter:
    number;
}

/*
 * ==========================================
 * SUCURSAL
 * ==========================================
 */

export interface SmartPurchaseStore {
  branchId:
    string;

  storeId:
    string;

  storeName:
    string;

  branchName:
    string;

  latitude:
    number;

  longitude:
    number;

  distanceFromUserKm:
    number;
}

/*
 * ==========================================
 * ASIGNACIÓN
 * ==========================================
 */

export interface SmartPurchaseAssignment {
  itemKey:
    string;

  productId:
    string;

  presentationId:
    | string
    | null;

  productName:
    string;

  presentationName:
    | string
    | null;

  quantity:
    number;

  branchId:
    string;

  storeId:
    string;

  storeName:
    string;

  branchName:
    string;

  unitPrice:
    number;

  lineTotal:
    number;
}

/*
 * ==========================================
 * PLAN DE COMPRA
 * ==========================================
 */

export interface SmartPurchasePlan {
  type:
    | "recommended"
    | "single_store"
    | "minimum_price";

  label:
    string;

  coveredItems:
    number;

  totalItems:
    number;

  coveragePercentage:
    number;

  productsTotal:
    number;

  travelDistanceKm:
    number;

  travelCost:
    number;

  estimatedTotal:
    number;

  storesCount:
    number;

  stores:
    SmartPurchaseStore[];

  itemAssignments:
    SmartPurchaseAssignment[];
}

/*
 * ==========================================
 * PRODUCTO SIN PRECIOS DISPONIBLES
 * ==========================================
 */

export interface SmartPurchaseUnavailableItem {
  itemKey:
    string;

  productId:
    string;

  productName:
    string;

  presentationId:
    | string
    | null;

  presentationName:
    | string
    | null;

  reason:
    "no_prices";
}

/*
 * ==========================================
 * RESULTADO
 * ==========================================
 */

export interface SmartPurchaseResult {
  available:
    boolean;

  reason:
    | string
    | null;

  mode:
    SmartTransportMode;

  maxStores:
    number;

  maxDistanceKm:
    number;

  recommended:
    SmartPurchasePlan | null;

  singleStore:
    SmartPurchasePlan | null;

  minimumPrice:
    SmartPurchasePlan | null;

  savingsVsSingle:
    | number
    | null;

  distanceNote:
    string;

  unavailableItems:
    SmartPurchaseUnavailableItem[];
}