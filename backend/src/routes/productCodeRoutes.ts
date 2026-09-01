import {
  Router,
} from "express";

import {
  createProductCode,
} from "../services/codeService";

const router =
  Router();

router.post(
  "/",
  async (
    request,
    response,
  ) => {
    try {
      const {
        productId,
        presentationId,
        storeName,
        code,
      } =
        request.body ?? {};

      if (
        typeof productId !==
          "string" ||
        !productId.trim()
      ) {
        response
          .status(400)
          .json({
            ok: false,

            error:
              "productId es obligatorio.",
          });

        return;
      }

      if (
        typeof presentationId !==
          "string" ||
        !presentationId.trim()
      ) {
        response
          .status(400)
          .json({
            ok: false,

            error:
              "presentationId es obligatorio.",
          });

        return;
      }

      if (
        typeof storeName !==
          "string" ||
        !storeName.trim()
      ) {
        response
          .status(400)
          .json({
            ok: false,

            error:
              "storeName es obligatorio.",
          });

        return;
      }

      if (
        typeof code !==
          "string" ||
        !code.trim()
      ) {
        response
          .status(400)
          .json({
            ok: false,

            error:
              "code es obligatorio.",
          });

        return;
      }

      const normalizedCode =
        code.trim();

      /*
       * Aceptamos códigos comunes
       * de ticket / UPC / EAN.
       */
      if (
        !/^\d{6,14}$/.test(
          normalizedCode,
        )
      ) {
        response
          .status(400)
          .json({
            ok: false,

            error:
              "El código del producto no tiene un formato válido.",
          });

        return;
      }

      const created =
        await createProductCode({
          productId:
            productId.trim(),

          presentationId:
            presentationId.trim(),

          storeName:
            storeName.trim(),

          code:
            normalizedCode,
        });

      response
        .status(201)
        .json({
          ok: true,

          productCode:
            created,
        });
    } catch (error) {
      console.error(
        "❌ Error creando product code:",
        error,
      );

      response
        .status(500)
        .json({
          ok: false,

          error:
            error instanceof Error
              ? error.message
              : "No se pudo guardar el código del producto.",
        });
    }
  },
);

export default router;