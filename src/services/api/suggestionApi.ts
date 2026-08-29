import {
  apiFetch,
} from "./http";

export type SmartSuggestionSource =
  | "memory"
  | "catalog"
  | "rules";

export interface SmartSuggestion {
  productName: string;

  brand: string | null;

  category: string | null;

  presentationName: string;

  sizeValue: number | null;

  sizeUnit: string | null;

  packageType: string | null;

  source:
    SmartSuggestionSource;

  confidence: number;
}

export async function getSmartSuggestion(
  rawName: string,
) {
  return apiFetch<{
    ok: boolean;
    suggestion: SmartSuggestion;
  }>(
    "/api/suggestions",
    {
      method: "POST",

      body:
        JSON.stringify({
          rawName,
        }),
    },
  );
}