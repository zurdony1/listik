import {
  apiFetch,
} from "./http";

import type {
  TicketAnalysis,
} from "../../types/TicketAnalysis";

export interface AnalyzeTicketResponse {
  ok: boolean;

  file?: {
    name: string;
    size: number;
    type: string;
  };

  analysis?: TicketAnalysis;

  error?: string;
}

export async function analyzeTicket(
  file: File,
) {
  const formData =
    new FormData();

  formData.append(
    "ticket",
    file,
  );

  return apiFetch<AnalyzeTicketResponse>(
    "/api/tickets/analyze",
    {
      method: "POST",
      body: formData,
    },
  );
}