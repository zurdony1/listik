import {
  apiFetch,
} from "./http";

export interface ConfirmedTicketPriceItem {
  productId: string;

  presentationId?:
    | string
    | null;

  rawName: string;

  quantity: number;

  unitPrice: number;
}

export interface SaveTicketPricesInput {
  storeId?:
    | string
    | null;

  storeBranchId?:
    | string
    | null;

  storeName: string;

  branch?:
    | string
    | null;

  purchaseDate?:
    | string
    | null;

  items:
    ConfirmedTicketPriceItem[];
}

export interface SavedTicketPrice {
  id: string;

  productId: string;

  presentationId:
    | string
    | null;

  storeId: string;

  storeBranchId:
    | string
    | null;

  price: number;

  branch:
    | string
    | null;

  observedAt:
    | string
    | null;
}

export interface SaveTicketPricesResponse {
  ok: boolean;

  message: string;

  total: number;

  prices:
    SavedTicketPrice[];
}

export async function saveTicketPrices(
  input:
    SaveTicketPricesInput,
) {
  return apiFetch<
    SaveTicketPricesResponse
  >(
    "/api/ticket-prices",
    {
      method:
        "POST",

      body:
        JSON.stringify(
          input,
        ),
    },
  );
}
