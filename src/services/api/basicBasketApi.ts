import type {
  BasicBasketRequestOptions,
  BasicBasketResponse,
} from "../../types/BasicBasket";

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

interface BasketApiEnvelope {
  ok: boolean;
  data?: BasicBasketResponse;
  message?: string;
}

export async function getBasicBasket(
  state: string,
  municipality: string,
  options: BasicBasketRequestOptions = {},
): Promise<BasicBasketResponse> {
  const params =
    new URLSearchParams({
      state,
      municipality,
    });

  if (
    options.userLat !==
    undefined
  ) {
    params.set(
      "userLat",
      String(
        options.userLat,
      ),
    );
  }

  if (
    options.userLng !==
    undefined
  ) {
    params.set(
      "userLng",
      String(
        options.userLng,
      ),
    );
  }

  if (
    options.mode
  ) {
    params.set(
      "mode",
      options.mode,
    );
  }

  if (
    options.maxStores
  ) {
    params.set(
      "maxStores",
      String(
        options.maxStores,
      ),
    );
  }

  if (
    options.maxDistanceKm
  ) {
    params.set(
      "maxDistanceKm",
      String(
        options.maxDistanceKm,
      ),
    );
  }

  if (
    options.gasPrice
  ) {
    params.set(
      "gasPrice",
      String(
        options.gasPrice,
      ),
    );
  }

  if (
    options.carKmPerLiter
  ) {
    params.set(
      "carKmPerLiter",
      String(
        options.carKmPerLiter,
      ),
    );
  }

  if (
    options.motoKmPerLiter
  ) {
    params.set(
      "motoKmPerLiter",
      String(
        options.motoKmPerLiter,
      ),
    );
  }

  const response =
    await fetch(
      `${API_URL}/api/basic-basket?${params.toString()}`,
    );

  const body =
    (await response.json()) as BasketApiEnvelope;

  if (
    !response.ok ||
    !body.ok ||
    !body.data
  ) {
    throw new Error(
      body.message ??
        "No se pudo calcular la canasta básica.",
    );
  }

  return body.data;
}
