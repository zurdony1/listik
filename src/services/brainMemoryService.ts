import {
  apiFetch,
} from "./api/http";

export interface SaveBrainMemoryInput {
  rawName: string;

  rawCode?: string | null;

  storeName?: string | null;

  productId?: string | null;

  presentationId?: string | null;

  confidence: number;

  source:
    | "code"
    | "name"
    | "manual";

  accepted: boolean;
}

interface BrainMemoryResponse {
  ok: boolean;

  memory: {
    id: string;

    raw_name: string;

    normalized_raw_name:
      | string
      | null;

    raw_code:
      | string
      | null;

    store_name:
      | string
      | null;

    product_id:
      | string
      | null;

    presentation_id:
      | string
      | null;

    confidence: number;

    source:
      | "code"
      | "name"
      | "manual";

    accepted: boolean;

    created_at: string;
  };
}

export async function saveBrainMemory(
  input: SaveBrainMemoryInput,
) {
  const data =
    await apiFetch<BrainMemoryResponse>(
      "/api/brain/memory",
      {
        method: "POST",

        body:
          JSON.stringify(input),
      },
    );

  return data.memory;
}