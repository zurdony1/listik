import type {
  Request,
  Response,
} from "express";

import {
  saveBrainMemory,
} from "../services/brainMemoryService";

interface BrainMemoryBody {
  rawName?: string;
  rawCode?: string | null;
  storeName?: string | null;

  productId?: string | null;
  presentationId?: string | null;

  confidence?: number;

  source?:
    | "code"
    | "name"
    | "manual";

  accepted?: boolean;
}

export async function createBrainMemory(
  request: Request<
    Record<string, never>,
    unknown,
    BrainMemoryBody
  >,
  response: Response,
) {
  try {
    const {
      rawName,
      rawCode,
      storeName,
      productId,
      presentationId,
      confidence,
      source,
      accepted,
    } = request.body;

    if (!rawName?.trim()) {
      response.status(400).json({
        ok: false,
        error:
          "rawName es obligatorio.",
      });

      return;
    }

    if (
      confidence === undefined ||
      Number.isNaN(
        Number(confidence),
      )
    ) {
      response.status(400).json({
        ok: false,
        error:
          "confidence es obligatorio.",
      });

      return;
    }

    const validSources = [
      "code",
      "name",
      "manual",
    ];

    if (
      !source ||
      !validSources.includes(source)
    ) {
      response.status(400).json({
        ok: false,
        error:
          "source debe ser code, name o manual.",
      });

      return;
    }

    const memory =
      await saveBrainMemory({
        rawName:
          rawName.trim(),

        rawCode:
          rawCode?.trim() || null,

        storeName:
          storeName?.trim() || null,

        productId:
          productId ?? null,

        presentationId:
          presentationId ?? null,

        confidence:
          Math.max(
            0,
            Math.min(
              100,
              Number(confidence),
            ),
          ),

        source,

        accepted:
          accepted ?? false,
      });

    response.status(201).json({
      ok: true,
      memory,
    });
  } catch (error) {
    console.error(
      "❌ Error guardando memoria:",
      error,
    );

    response.status(500).json({
      ok: false,

      error:
        error instanceof Error
          ? error.message
          : "No se pudo guardar la memoria.",
    });
  }
}