import type {
  Request,
  Response,
} from "express";

import {
  localTicketReader,
} from "../ticketReader/LocalTicketReader";

import {
  processDetectedTicket,
} from "../services/ticketProcessingService";

export async function analyzeTicket(
  request: Request,
  response: Response,
) {
  try {
    const ticketFile =
      request.file;

    if (!ticketFile) {
      response
        .status(400)
        .json({
          ok: false,

          error:
            "No se recibió ninguna imagen del ticket.",
        });

      return;
    }

    console.log("");
    console.log(
      "================================",
    );

    console.log(
      "🧾 NUEVO TICKET",
    );

    console.log({
      filename:
        ticketFile.originalname,

      size:
        ticketFile.size,

      mimetype:
        ticketFile.mimetype,
    });

    /*
     * ============================
     * 1. LECTOR LOCAL
     * ============================
     *
     * Imagen
     * ↓
     * Sharp
     * ↓
     * Tesseract
     * ↓
     * Parser Listik
     */
    const detectedTicket =
      await localTicketReader.analyze(
        ticketFile.buffer,
        ticketFile.mimetype,
      );

    console.log("");
    console.log(
      `📷 Lector local detectó ${detectedTicket.items.length} productos.`,
    );

    /*
     * Si OCR no encontró
     * ningún producto,
     * devolvemos también
     * rawText para depuración.
     */
    if (
      detectedTicket.items.length ===
      0
    ) {
      response
        .status(422)
        .json({
          ok: false,

          error:
            "El OCR leyó el ticket, pero no pudo identificar renglones de producto.",

          rawText:
            detectedTicket.rawText ??
            "",
        });

      return;
    }

    /*
     * ============================
     * 2. LISTIK BRAIN
     * ============================
     *
     * El lector NO decide
     * qué producto es.
     *
     * Solo entrega:
     *
     * rawCode
     * rawName
     * quantity
     * unitPrice
     * totalPrice
     *
     * Brain hace el resto.
     */
    const analysis =
      await processDetectedTicket({
        store:
          detectedTicket.store,

        branch:
          detectedTicket.branch,

        purchaseDate:
          detectedTicket.purchaseDate,

        total:
          detectedTicket.total,

        items:
          detectedTicket.items.map(
            (item) => ({
              rawCode:
                item.rawCode,

              rawName:
                item.rawName,

              quantity:
                item.quantity,

              unitPrice:
                item.unitPrice,

              totalPrice:
                item.totalPrice,
            }),
          ),
      });

    console.log("");
    console.log(
      "🧠 LISTIK BRAIN TERMINÓ",
    );

    console.log({
      totalItems:
        analysis.items.length,

      confirmed:
        analysis.summary.confirmed,

      pending:
        analysis.summary.pending,
    });

    /*
     * ============================
     * 3. RESPUESTA
     * ============================
     */

    response.json({
      ok: true,

      file: {
        name:
          ticketFile.originalname,

        size:
          ticketFile.size,

        type:
          ticketFile.mimetype,
      },

      /*
       * Nos sirve para saber
       * cuántos renglones logró
       * obtener OCR antes del Brain.
       */
      extraction: {
        detectedItems:
          detectedTicket.items.length,

        store:
          detectedTicket.store,

        branch:
          detectedTicket.branch ??
          null,

        purchaseDate:
          detectedTicket.purchaseDate ??
          null,

        total:
          detectedTicket.total,
      },

      analysis,
    });
  } catch (error) {
    console.error(
      "❌ Error procesando ticket:",
      error,
    );

    response
      .status(500)
      .json({
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "No se pudo procesar el ticket.",
      });
  }
}