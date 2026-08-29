import { Router } from "express";

import {
  buildSmartSuggestion,
} from "../brain/SmartSuggestion";

const router = Router();

router.post(
  "/",
  async (request, response) => {
    try {
      const body =
        request.body as
          | {
              rawName?: string;
            }
          | undefined;

      const rawName =
        body?.rawName;

      if (!rawName?.trim()) {
        response.status(400).json({
          error:
            "rawName es obligatorio.",
        });

        return;
      }

      const suggestion =
        await buildSmartSuggestion(
          rawName.trim(),
        );

      response.json({
        ok: true,
        suggestion,
      });
    } catch (error) {
      console.error(
        "Error generando Smart Suggestion:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar la sugerencia.",
      });
    }
  },
);

export default router;