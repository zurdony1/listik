import {
  Router,
} from "express";

import multer from "multer";

import {
  analyzePromotionFlyer,
} from "../services/promotionFlyerReader";

import {
  cropPromotionSegments,
} from "../services/promotionFlyerCropper";

import {
  uploadPromotionImageToStorage,
} from "../services/promotionImageStorage";

import {
  deletePromotions,
  getAdminPromotions,
  importPromotions,
  updatePromotionStatus,
  type PromotionImportRow,
} from "../services/adminPromotionService";

const router =
  Router();

/*
 * ==========================================
 * MULTER
 * ==========================================
 */

const upload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        10 *
        1024 *
        1024,
    },

    fileFilter: (
      _request,
      file,
      callback,
    ) => {
      const allowed =
        [
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(
          file.mimetype,
        );

      if (
        !allowed
      ) {
        callback(
          new Error(
            "Solo se permiten imágenes JPG, PNG o WEBP.",
          ),
        );

        return;
      }

      callback(
        null,
        true,
      );
    },
  });

/*
 * ==========================================
 * LISTAR PROMOCIONES
 * ==========================================
 */

router.get(
  "/",
  async (
    _request,
    response,
  ) => {
    try {
      const promotions =
        await getAdminPromotions();

      response.json({
        ok: true,
        promotions,
      });
    } catch (
      error
    ) {
      console.error(
        "Error cargando promociones:",
        error,
      );

      response
        .status(
          500,
        )
        .json({
          ok: false,

          error:
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las promociones.",
        });
    }
  },
);

/*
 * ==========================================
 * ANALIZAR FOLLETO
 * ==========================================
 */

router.post(
  "/analyze-image",
  upload.single(
    "flyer",
  ),
  async (
    request,
    response,
  ) => {
    try {
      const file =
        request.file;

      if (
        !file
      ) {
        response
          .status(
            400,
          )
          .json({
            ok: false,

            error:
              "No se recibió ninguna imagen.",
          });

        return;
      }

      console.log(
        "🖼️ Analizando folleto:",
        {
          name:
            file.originalname,

          size:
            file.size,

          type:
            file.mimetype,
        },
      );

      /*
       * ======================================
       * OCR
       * ======================================
       */

      const analysis =
        await analyzePromotionFlyer(
          file.buffer,
        );

      const segmentIndexes =
        analysis.candidates.map(
          (
            candidate,
          ) =>
            candidate.segmentIndex,
        );

      /*
       * ======================================
       * RECORTES AUTOMÁTICOS
       * ======================================
       */

      let cropMap =
        new Map<
          number,
          string
        >();

      try {
        const crops =
          await cropPromotionSegments(
            file.buffer,
            segmentIndexes,
            analysis.summary.segments,
          );

        const uploaded =
          await Promise.all(
            crops.map(
              async (
                crop,
              ) => {
                const stored =
                  await uploadPromotionImageToStorage(
                    crop.buffer,
                    "image/webp",
                    "auto-crops",
                  );

                return {
                  segmentIndex:
                    crop.segmentIndex,

                  url:
                    stored.url,
                };
              },
            ),
          );

        cropMap =
          new Map(
            uploaded.map(
              (
                item,
              ) => [
                item.segmentIndex,
                item.url,
              ],
            ),
          );
      } catch (
        cropError
      ) {
        /*
         * No detenemos OCR si falla Storage.
         * Admin todavía puede cargar imagen manual.
         */

        console.error(
          "No se pudieron generar recortes automáticos:",
          cropError,
        );
      }

      /*
       * ======================================
       * UNIR OCR + IMAGEN
       * ======================================
       */

      const candidates =
        analysis.candidates.map(
          (
            candidate,
          ) => ({
            ...candidate,

            imageUrl:
              cropMap.get(
                candidate.segmentIndex,
              ) ??
              null,
          }),
        );

      response.json({
        ok: true,

        file: {
          name:
            file.originalname,

          size:
            file.size,

          type:
            file.mimetype,
        },

        analysis: {
          ...analysis,

          candidates,
        },
      });
    } catch (
      error
    ) {
      console.error(
        "Error analizando folleto:",
        error,
      );

      response
        .status(
          500,
        )
        .json({
          ok: false,

          error:
            error instanceof Error
              ? error.message
              : "No se pudo analizar el folleto.",
        });
    }
  },
);

/*
 * ==========================================
 * SUBIR IMAGEN MANUAL
 * ==========================================
 */

router.post(
  "/upload-image",
  upload.single(
    "image",
  ),
  async (
    request,
    response,
  ) => {
    try {
      const file =
        request.file;

      if (
        !file
      ) {
        response
          .status(
            400,
          )
          .json({
            ok: false,

            error:
              "No se recibió ninguna imagen.",
          });

        return;
      }

      const image =
        await uploadPromotionImageToStorage(
          file.buffer,
          file.mimetype,
          "manual",
        );

      response.json({
        ok: true,

        image,
      });
    } catch (
      error
    ) {
      console.error(
        "Error subiendo imagen:",
        error,
      );

      response
        .status(
          500,
        )
        .json({
          ok: false,

          error:
            error instanceof Error
              ? error.message
              : "No se pudo subir la imagen.",
        });
    }
  },
);

/*
 * ==========================================
 * IMPORTAR PROMOCIONES
 * ==========================================
 */

router.post(
  "/import",
  async (
    request,
    response,
  ) => {
    try {
      const rows =
        request.body
          ?.rows as
          | PromotionImportRow[]
          | undefined;

      if (
        !Array.isArray(
          rows,
        ) ||
        rows.length ===
          0
      ) {
        response
          .status(
            400,
          )
          .json({
            ok: false,

            error:
              "rows debe ser un arreglo con promociones.",
          });

        return;
      }

      const result =
        await importPromotions(
          rows,
        );

      response.json({
        ok: true,

        ...result,
      });
    } catch (
      error
    ) {
      console.error(
        "Error importando promociones:",
        error,
      );

      response
        .status(
          500,
        )
        .json({
          ok: false,

          error:
            error instanceof Error
              ? error.message
              : "No se pudieron importar las promociones.",
        });
    }
  },
);

/*
 * ==========================================
 * ELIMINAR UNA O VARIAS PROMOCIONES
 * ==========================================
 */

router.post(
  "/delete",
  async (
    request,
    response,
  ) => {
    try {
      const promotionIds =
        request.body
          ?.promotionIds as
          | string[]
          | undefined;

      if (
        !Array.isArray(
          promotionIds,
        ) ||
        promotionIds.length ===
          0
      ) {
        response
          .status(
            400,
          )
          .json({
            ok: false,

            error:
              "promotionIds debe contener al menos una promoción.",
          });

        return;
      }

      const cleanIds =
        [
          ...new Set(
            promotionIds
              .map(
                (
                  id,
                ) =>
                  String(
                    id,
                  ).trim(),
              )
              .filter(
                Boolean,
              ),
          ),
        ];

      if (
        cleanIds.length ===
          0
      ) {
        response
          .status(
            400,
          )
          .json({
            ok: false,

            error:
              "No se recibieron IDs válidos.",
          });

        return;
      }

      const deleted =
        await deletePromotions(
          cleanIds,
        );

      console.log(
        `🗑️ ${deleted} promoción(es) eliminadas.`,
      );

      response.json({
        ok: true,

        deleted,
      });
    } catch (
      error
    ) {
      console.error(
        "Error eliminando promociones:",
        error,
      );

      response
        .status(
          500,
        )
        .json({
          ok: false,

          error:
            error instanceof Error
              ? error.message
              : "No se pudieron eliminar las promociones.",
        });
    }
  },
);

/*
 * ==========================================
 * CAMBIAR ESTADO
 * ==========================================
 */

router.patch(
  "/:promotionId/status",
  async (
    request,
    response,
  ) => {
    try {
      const promotionId =
        String(
          request.params
            .promotionId ??
          "",
        ).trim();

      const status =
        request.body
          ?.status as
          | "approved"
          | "paused"
          | undefined;

      if (
        !promotionId
      ) {
        response
          .status(
            400,
          )
          .json({
            ok: false,

            error:
              "promotionId es obligatorio.",
          });

        return;
      }

      if (
        status !==
          "approved" &&
        status !==
          "paused"
      ) {
        response
          .status(
            400,
          )
          .json({
            ok: false,

            error:
              "status debe ser approved o paused.",
          });

        return;
      }

      await updatePromotionStatus(
        promotionId,
        status,
      );

      response.json({
        ok: true,
      });
    } catch (
      error
    ) {
      console.error(
        "Error cambiando estado:",
        error,
      );

      response
        .status(
          500,
        )
        .json({
          ok: false,

          error:
            error instanceof Error
              ? error.message
              : "No se pudo actualizar la promoción.",
        });
    }
  },
);

export default router;