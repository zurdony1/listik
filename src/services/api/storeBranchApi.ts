import {
  apiFetch,
} from "./http";

export interface CreateStoreBranchInput {
  storeId: string;
  name: string;
  municipality: string;
  state: string;
  latitude: number;
  longitude: number;
}

export interface CreateStoreBranchResponse {
  ok: boolean;

  message: string;

  data: {
    id: string;
    storeId: string;
    name: string;

    municipality:
      | string
      | null;

    state:
      | string
      | null;

    latitude:
      | number
      | null;

    longitude:
      | number
      | null;

    created:
      boolean;
  };
}

export async function createStoreBranch(
  input:
    CreateStoreBranchInput,
) {
  return apiFetch<
    CreateStoreBranchResponse
  >(
    "/api/store-branches",
    {
      method: "POST",

      body:
        JSON.stringify(
          input,
        ),
    },
  );
}
