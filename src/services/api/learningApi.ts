import {
  apiFetch,
} from "./http";

export type LearningStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface LearningItem {
  id: string;

  raw_name: string;

  raw_code:
    | string
    | null;

  store_name:
    | string
    | null;

  confidence: number;

  status: LearningStatus;

  created_at: string;
}

export interface ApproveLearningInput {
  rawName: string;

  rawCode?: string | null;

  storeName?: string | null;

  product: {
    name: string;
    brand?: string | null;
    category?: string | null;
  };

  presentation: {
    presentationName: string;
    sizeValue?: number | null;
    sizeUnit?: string | null;
    packageType?: string | null;
  };
}

interface ApproveLearningResponse {
  ok: boolean;

  message: string;

  product: {
    id: string;
    name: string;
    brand: string | null;
    category: string | null;
  };

  presentation: {
    id: string;
    product_id: string;
    presentation_name: string;
    size_value: number | null;
    size_unit: string | null;
    package_type: string | null;
  };
}

export async function getLearningQueue() {
  return apiFetch<LearningItem[]>(
    "/api/learning",
  );
}

export async function updateLearningStatus(
  id: string,
  status: LearningStatus,
) {
  return apiFetch<{
    ok: boolean;
    item: LearningItem;
  }>(
    `/api/learning/${id}/status`,
    {
      method: "PATCH",

      body: JSON.stringify({
        status,
      }),
    },
  );
}

export async function approveLearning(
  id: string,
  input: ApproveLearningInput,
) {
  return apiFetch<ApproveLearningResponse>(
    `/api/learning/${id}/approve`,
    {
      method: "POST",

      body: JSON.stringify(input),
    },
  );
}