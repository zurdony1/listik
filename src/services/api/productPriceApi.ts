import {
  apiFetch,
} from "./http";

/*
 * ==========================================
 * PRECIO DE PRODUCTO
 * ==========================================
 */

export interface ProductPrice {
  id: string;

  storeId: string;

  storeName: string;

  storeBranchId:
    | string
    | null;

  branch:
    | string
    | null;

  price: number;

  source:
    | string
    | null;

  observedAt:
    | string
    | null;
}

/*
 * ==========================================
 * RESPUESTA
 * ==========================================
 */

export interface ProductPriceResult {
  productId: string;

  productName: string;

  brand:
    | string
    | null;

  category:
    | string
    | null;

  presentationId:
    | string
    | null;

  presentationName:
    | string
    | null;

  prices:
    ProductPrice[];
}

/*
 * ==========================================
 * OPCIONES DE CONSULTA
 * ==========================================
 */

export interface GetProductPricesOptions {
  presentationId?:
    | string
    | null;

  state:
    | string
    | null;

  municipality:
    | string
    | null;
}

/*
 * ==========================================
 * OBTENER PRECIOS
 * ==========================================
 *
 * Mandamos:
 *
 * productId
 * presentationId
 * state
 * municipality
 *
 * La API devuelve también storeBranchId
 * para identificar la sucursal exacta.
 */

export async function getProductPrices(
  productId: string,
  options:
    GetProductPricesOptions,
) {
  const params =
    new URLSearchParams();

  if (
    options.presentationId
  ) {
    params.set(
      "presentationId",
      options.presentationId,
    );
  }

  if (
    options.state
      ?.trim()
  ) {
    params.set(
      "state",
      options.state.trim(),
    );
  }

  if (
    options.municipality
      ?.trim()
  ) {
    params.set(
      "municipality",
      options.municipality.trim(),
    );
  }

  const queryString =
    params.toString();

  const url =
    queryString
      ? `/api/product-prices/${productId}?${queryString}`
      : `/api/product-prices/${productId}`;

  console.log(
    "💵 CONSULTANDO COMPARACIÓN LOCAL:",
    {
      productId,

      presentationId:
        options.presentationId ??
        null,

      state:
        options.state,

      municipality:
        options.municipality,

      url,
    },
  );

  return apiFetch<{
    ok: boolean;

    data:
      ProductPriceResult;
  }>(
    url,
  );
}