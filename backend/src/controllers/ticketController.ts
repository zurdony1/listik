import type {
  Request,
  Response,
} from "express";

import {
  localTicketReader,
} from "../ticketReader/LocalTicketReader";

import {
  analyzeTicketWithVision,
} from "../ai/ticketVision";

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
     * ==========================================
     * 1. LECTOR LOCAL
     * ==========================================
     *
     * Primero intentamos usar:
     *
     * Sharp
     * ↓
     * Tesseract
     * ↓
     * Parser Listik
     *
     * Esto nos ayuda a reducir
     * consumo de IA cuando el
     * ticket puede resolverse localmente.
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
     * ==========================================
     * 2. DECIDIR ORIGEN DE EXTRACCIÓN
     * ==========================================
     */

    let extractedTicket: {
      store: string;

      branch:
        | string
        | null
        | undefined;

      purchaseDate:
        | string
        | null
        | undefined;

      total: number;

      items: Array<{
        rawCode?:
          | string
          | null
          | undefined;

        rawName: string;

        quantity: number;

        unitPrice: number;

        totalPrice: number;
      }>;

      source:
        | "local"
        | "vision";
    };

    /*
     * Si el lector local encontró
     * productos, seguimos usando
     * ese resultado.
     */
    if (
      detectedTicket.items.length >
      0
    ) {
      console.log(
        "✅ Usando extracción local.",
      );

      extractedTicket = {
        store:
          detectedTicket.store,

        branch:
          detectedTicket.branch,

        purchaseDate:
          detectedTicket.purchaseDate,

        total:
          detectedTicket.total,

        items:
          detectedTicket.items,

        source:
          "local",
      };
    } else {
      /*
       * ==========================================
       * FALLBACK CON OPENAI VISION
       * ==========================================
       *
       * El OCR sí pudo leer la imagen,
       * pero nuestro parser no entendió
       * el formato del supermercado.
       *
       * Mandamos LA FOTO ORIGINAL
       * a OpenAI.
       */

      console.log("");
      console.log(
        "⚠️ El lector local no encontró productos.",
      );

      console.log(
        "🤖 Activando OpenAI Vision...",
      );

      try {
        const visionTicket =
          await analyzeTicketWithVision({
            image:
              ticketFile.buffer,

            mimeType:
              ticketFile.mimetype,
          });

        console.log("");
        console.log(
          `👁️ Vision detectó ${visionTicket.items.length} productos.`,
        );

        if (
          visionTicket.items.length ===
          0
        ) {
          response
            .status(422)
            .json({
              ok: false,

              error:
                "No se pudieron identificar productos en el ticket.",

              rawText:
                detectedTicket.rawText ??
                "",
            });

          return;
        }

        extractedTicket = {
          store:
            visionTicket.store,

          branch:
            visionTicket.branch,

          purchaseDate:
            visionTicket.purchaseDate,

          total:
            visionTicket.total,

          items:
            visionTicket.items,

          source:
            "vision",
        };
      } catch (visionError) {
        console.error(
          "❌ Vision también falló:",
          visionError,
        );

        response
          .status(422)
          .json({
            ok: false,

            error:
              "El OCR leyó el ticket, pero no pudo identificar los productos y el lector con IA tampoco pudo procesarlo.",

            rawText:
              detectedTicket.rawText ??
              "",

            visionError:
              visionError instanceof Error
                ? visionError.message
                : "Error desconocido en Vision.",
          });

        return;
      }
    }

    /*
     * ==========================================
     * 3. LISTIK BRAIN
     * ==========================================
     *
     * Brain recibe siempre el mismo
     * formato sin importar si vino
     * de Tesseract o de Vision.
     */

    const analysis =
      await processDetectedTicket({
        store:
          extractedTicket.store,

        branch:
          extractedTicket.branch ??
          undefined,

        purchaseDate:
          extractedTicket.purchaseDate ??
          undefined,

        total:
          extractedTicket.total,

        items:
          extractedTicket.items.map(
            (item) => ({
              rawCode:
                item.rawCode ??
                undefined,

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
      source:
        extractedTicket.source,

      totalItems:
        analysis.items.length,

      confirmed:
        analysis.summary.confirmed,

      pending:
        analysis.summary.pending,
    });

    /*
     * ==========================================
     * 4. RESPUESTA
     * ==========================================
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

      extraction: {
        source:
          extractedTicket.source,

        detectedItems:
          extractedTicket.items.length,

        store:
          extractedTicket.store,

        branch:
          extractedTicket.branch ??
          null,

        purchaseDate:
          extractedTicket.purchaseDate ??
          null,

        total:
          extractedTicket.total,
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