import {
  Router,
} from "express";

import {
  saveTicketPrices,
  type SaveTicketPricesInput,
} from "../services/ticketPriceService";

const router =
  Router();

/*
 * POST /api/ticket-prices
 *
 * Guarda ÚNICAMENTE precios que el frontend
 * ya presentó al usuario para revisión.
 *
 * La tienda y sucursal deben apuntar a entidades
 * existentes; el backend ya no crea tiendas
 * automáticamente desde texto OCR.
 */
router.post(
  "/",
  async (
    request,
    response,
  ) => {
    try {
      const body =
        request.body as
          | SaveTicketPricesInput
          | undefined;

      if (
        !body
      ) {
        response
          .status(
            400,
          )
          .json({
            ok:
              false,

            error:
              "El cuerpo de la petición es obligatorio.",
          });

        return;
      }

      if (
        !body.storeId &&
        !body.storeName
          ?.trim()
      ) {
        response
          .status(
            400,
          )
          .json({
            ok:
              false,

            error:
              "Debes confirmar la tienda antes de guardar el ticket.",
          });

        return;
      }

      if (
        !Array.isArray(
          body.items,
        )
      ) {
        response
          .status(
            400,
          )
          .json({
            ok:
              false,

            error:
              "items debe ser un arreglo.",
          });

        return;
      }

      if (
        body.items.length ===
        0
      ) {
        response
          .status(
            400,
          )
          .json({
            ok:
              false,

            error:
              "No hay productos para guardar.",
          });

        return;
      }

      for (
        const item
        of body.items
      ) {
        if (
          !item.productId
        ) {
          response
            .status(
              400,
            )
            .json({
              ok:
                false,

              error:
                `El producto "${item.rawName}" no tiene productId confirmado.`,
            });

          return;
        }

        if (
          !Number.isFinite(
            item.quantity,
          ) ||
          item.quantity <=
            0
        ) {
          response
            .status(
              400,
            )
            .json({
              ok:
                false,

              error:
                `El producto "${item.rawName}" tiene una cantidad inválida.`,
            });

          return;
        }

        if (
          !Number.isFinite(
            item.unitPrice,
          ) ||
          item.unitPrice <=
            0
        ) {
          response
            .status(
              400,
            )
            .json({
              ok:
                false,

              error:
                `El producto "${item.rawName}" tiene un precio inválido.`,
            });

          return;
        }
      }

      const prices =
        await saveTicketPrices({
          storeId:
            body.storeId ??
            null,

          storeBranchId:
            body.storeBranchId ??
            null,

          storeName:
            body.storeName,

          branch:
            body.branch ??
            null,

          purchaseDate:
            body.purchaseDate ??
            null,

          items:
            body.items,
        });

      response
        .status(
          201,
        )
        .json({
          ok:
            true,

          message:
            `${prices.length} precios guardados correctamente.`,

          total:
            prices.length,

          prices,
        });
    } catch (
      error
    ) {
      console.error(
        "Error guardando precios del ticket:",
        error,
      );

      /*
       * Errores de confirmación de tienda/sucursal
       * son problemas de datos del usuario, no un
       * fallo interno del servidor.
       */
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los precios.";

      const isValidationError =
        /confirma|confirmar|no encontramos|no existe|no pertenece/i.test(
          message,
        );

      response
        .status(
          isValidationError
            ? 422
            : 500,
        )
        .json({
          ok:
            false,

          error:
            message,
        });
    }
  },
);

export default router;
