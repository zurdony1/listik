import crypto from "node:crypto";

import {
  identifyProduct,
} from "../brain/productIntelligence";

import {
  createCatalogLearning,
} from "./catalogLearningService";

export interface DetectedTicketItem {
  rawCode?: string;

  rawName: string;

  quantity: number;

  unitPrice: number;

  totalPrice: number;
}

export interface DetectedTicket {
  store: string;

  branch?: string;

  purchaseDate?: string;

  total: number;

  items: DetectedTicketItem[];
}

export type TicketItemStatus =
  | "pending"
  | "confirmed"
  | "new-product";

type MatchResultRecord =
  Record<string, unknown>;

function getString(
  value: unknown,
): string | null {
  if (
    typeof value ===
      "string" &&
    value.trim()
  ) {
    return value;
  }

  return null;
}

function getProductId(
  result: unknown,
): string | null {
  if (
    !result ||
    typeof result !==
      "object"
  ) {
    return null;
  }

  const record =
    result as MatchResultRecord;

  const productId =
    getString(
      record.productId,
    );

  if (
    productId
  ) {
    return productId;
  }

  const snakeProductId =
    getString(
      record.product_id,
    );

  if (
    snakeProductId
  ) {
    return snakeProductId;
  }

  const hasPresentation =
    Boolean(
      record.presentationName ??
        record.presentation_name ??
        record.sizeValue ??
        record.size_value,
    );

  if (
    !hasPresentation
  ) {
    return getString(
      record.id,
    );
  }

  return null;
}

function getPresentationId(
  result: unknown,
): string | null {
  if (
    !result ||
    typeof result !==
      "object"
  ) {
    return null;
  }

  const record =
    result as MatchResultRecord;

  const presentationId =
    getString(
      record.presentationId,
    );

  if (
    presentationId
  ) {
    return presentationId;
  }

  const snakePresentationId =
    getString(
      record.presentation_id,
    );

  if (
    snakePresentationId
  ) {
    return snakePresentationId;
  }

  const hasPresentation =
    Boolean(
      record.presentationName ??
        record.presentation_name ??
        record.sizeValue ??
        record.size_value,
    );

  if (
    hasPresentation
  ) {
    return getString(
      record.id,
    );
  }

  return null;
}

function normalizeConfidence(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      value,
    ),
  );
}

function determineStatus(
  hasMatch: boolean,
  confidence: number,
): TicketItemStatus {
  if (
    hasMatch &&
    confidence >=
      95
  ) {
    return "confirmed";
  }

  return "pending";
}

function shouldCreateLearning(
  hasMatch: boolean,
  confidence: number,
) {
  /*
   * Todo lo que no sea un match muy seguro
   * puede enseñarle algo a Listik Brain.
   *
   * - Sin match: sí
   * - Match < 95%: sí
   * - Match >= 95%: no
   */
  return (
    !hasMatch ||
    confidence <
      95
  );
}

export async function processDetectedTicket(
  ticket: DetectedTicket,
) {
  const processedItems = [];

  for (
    const item
    of ticket.items
  ) {
    const match =
      await identifyProduct({
        storeName:
          ticket.store,

        rawCode:
          item.rawCode,

        rawName:
          item.rawName,
      });

    const confidence =
      normalizeConfidence(
        Number(
          match.confidence ??
            0,
        ),
      );

    const suggestedProductId =
      getProductId(
        match.result,
      );

    const suggestedPresentationId =
      getPresentationId(
        match.result,
      );

    const hasMatch =
      Boolean(
        match.result &&
        suggestedProductId,
      );

    console.log(
      "🧩 MATCH IDS:",
      {
        rawName:
          item.rawName,

        source:
          match.source,

        confidence,

        suggestedProductId,

        suggestedPresentationId,
      },
    );

    /*
     * ==========================================
     * BRAIN QUEUE / LEARNING
     * ==========================================
     *
     * Antes solo mandábamos a Queue cuando
     * no había ningún match.
     *
     * Ahora también mandamos matches de baja
     * confianza (<95) para que la confirmación
     * humana pueda convertirse en aprendizaje.
     */

    let learningId:
      | string
      | null =
      null;

    if (
      shouldCreateLearning(
        hasMatch,
        confidence,
      )
    ) {
      try {
        const learning =
          await createCatalogLearning({
            rawName:
              item.rawName,

            rawCode:
              item.rawCode ??
              null,

            storeName:
              ticket.store,

            suggestedProductId,

            suggestedPresentationId,

            confidence,
          });

        learningId =
          learning?.id
            ? String(
                learning.id,
              )
            : null;

        console.log(
          `🧠 Enviado a Brain Queue: ${item.rawName}`,
        );

        console.log(
          "🆔 Learning ID:",
          learningId,
        );
      } catch (
        error
      ) {
        console.error(
          `❌ No se pudo enviar ${item.rawName} a Brain Queue:`,
          error,
        );
      }
    }

    const status =
      determineStatus(
        hasMatch,
        confidence,
      );

    processedItems.push({
      id:
        crypto.randomUUID(),

      ...item,

      matchSource:
        match.source,

      confidence,

      brainScore:
        match.brainScore,

      previousMemories:
        match.previousMemories,

      suggestedProduct:
        match.result,

      suggestedProductId,

      suggestedPresentationId,

      learningId,

      status,

      requiresReview:
        status ===
        "pending",

      unmatched:
        !hasMatch,
    });
  }

  const confirmed =
    processedItems.filter(
      (
        item,
      ) =>
        item.status ===
        "confirmed",
    ).length;

  const pending =
    processedItems.filter(
      (
        item,
      ) =>
        item.status ===
        "pending",
    ).length;

  const unmatched =
    processedItems.filter(
      (
        item,
      ) =>
        item.unmatched,
    ).length;

  return {
    store:
      ticket.store,

    branch:
      ticket.branch ??
      null,

    purchaseDate:
      ticket.purchaseDate ??
      null,

    total:
      ticket.total,

    items:
      processedItems,

    summary: {
      totalItems:
        processedItems.length,

      confirmed,

      pending,

      unmatched,

      newProducts:
        0,
    },
  };
}
