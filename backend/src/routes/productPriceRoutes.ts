import {
  Router,
} from "express";

import {
  getProductPrices,
} from "../services/productPriceService";

const router =
  Router();

router.get(
  "/:productId",
  async (
    request,
    response,
  ) => {
    try {
      const {
        productId,
      } =
        request.params;

      const presentationId =
        typeof request.query
          .presentationId ===
        "string"
          ? request.query
              .presentationId
          : null;

      const state =
        typeof request.query
          .state ===
        "string"
          ? request.query
              .state
              .trim()
          : "";

      const municipality =
        typeof request.query
          .municipality ===
        "string"
          ? request.query
              .municipality
              .trim()
          : "";

      if (
        !state ||
        !municipality
      ) {
        response
          .status(400)
          .json({
            ok: false,

            error:
              "Faltan state y municipality para consultar precios locales.",
          });

        return;
      }

      const result =
        await getProductPrices(
          productId,
          {
            presentationId,

            state,

            municipality,
          },
        );

      if (
        !result
      ) {
        response
          .status(404)
          .json({
            ok: false,

            error:
              "Producto no encontrado.",
          });

        return;
      }

      response.json({
        ok: true,

        data:
          result,
      });
    } catch (
      error
    ) {
      console.error(
        "Error consultando precios:",
        error,
      );

      response
        .status(500)
        .json({
          ok: false,

          error:
            error instanceof Error
              ? error.message
              : "No se pudieron consultar los precios.",
        });
    }
  },
);

export default router;