import { Router } from "express";

import {
  getPendingCatalogLearning,
  updateCatalogLearningStatus,
} from "../services/catalogLearningService";

import {
  approveCatalogLearning,
} from "../services/catalogApprovalService";

const router = Router();

/*
 * GET /api/learning
 *
 * Obtener todos los pendientes
 * de Brain Queue.
 */
router.get(
  "/",
  async (_request, response) => {
    try {
      const data =
        await getPendingCatalogLearning();

      response.json(data);
    } catch (error) {
      console.error(
        "Error cargando Brain Queue:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar la cola.",
      });
    }
  },
);

/*
 * PATCH /api/learning/:id/status
 *
 * Cambiar estado manualmente:
 * pending
 * approved
 * rejected
 */
router.patch(
  "/:id/status",
  async (request, response) => {
    try {
      const { id } =
        request.params;

      const { status } =
        request.body as {
          status?:
            | "pending"
            | "approved"
            | "rejected";
        };

      if (
        !status ||
        ![
          "pending",
          "approved",
          "rejected",
        ].includes(status)
      ) {
        response.status(400).json({
          error:
            "Estado inválido.",
        });

        return;
      }

      const item =
        await updateCatalogLearningStatus(
          id,
          status,
        );

      response.json({
        ok: true,
        item,
      });
    } catch (error) {
      console.error(
        "Error actualizando Brain Queue:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar.",
      });
    }
  },
);

/*
 * POST /api/learning/:id/approve
 *
 * Aprobar un aprendizaje y
 * convertirlo en catálogo real.
 */
router.post(
  "/:id/approve",
  async (request, response) => {
    try {
      const { id } =
        request.params;

      const {
        rawName,
        rawCode,
        storeName,
        product,
        presentation,
      } = request.body;

      /*
       * Validaciones
       */
      if (!rawName?.trim()) {
        response.status(400).json({
          error:
            "rawName es obligatorio.",
        });

        return;
      }

      if (
        !product?.name?.trim()
      ) {
        response.status(400).json({
          error:
            "El nombre del producto es obligatorio.",
        });

        return;
      }

      if (
        !presentation
          ?.presentationName
          ?.trim()
      ) {
        response.status(400).json({
          error:
            "La presentación es obligatoria.",
        });

        return;
      }

      /*
       * Aprobar y crear:
       *
       * product
       * presentation
       * product_code si existe
       * brain_memory
       * catalog_learning = approved
       */
      const result =
        await approveCatalogLearning({
          learningId:
            id,

          rawName:
            rawName.trim(),

          rawCode:
            rawCode?.trim() ||
            null,

          storeName:
            storeName?.trim() ||
            null,

          product: {
            name:
              product.name.trim(),

            brand:
              product.brand?.trim() ||
              null,

            category:
              product.category?.trim() ||
              null,
          },

          presentation: {
            presentationName:
              presentation
                .presentationName
                .trim(),

            sizeValue:
              presentation.sizeValue ??
              null,

            sizeUnit:
              presentation.sizeUnit
                ?.trim() ||
              null,

            packageType:
              presentation.packageType
                ?.trim() ||
              null,
          },
        });

      response.status(201).json({
        ok: true,

        message:
          "Aprendizaje aprobado correctamente.",

        product:
          result.product,

        presentation:
          result.presentation,
      });
    } catch (error) {
      console.error(
        "Error aprobando aprendizaje:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "No se pudo aprobar el aprendizaje.",
      });
    }
  },
);

export default router;