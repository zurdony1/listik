import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import ticketRoutes from "./routes/ticketRoutes";
import brainRoutes from "./routes/brainRoutes";
import learningRoutes from "./routes/learningRoutes";
import suggestionRoutes from "./routes/suggestionRoutes";
import ticketPriceRoutes from "./routes/ticketPriceRoutes";
import productPriceRoutes from "./routes/productPriceRoutes";
import adminProfecoRouter from "./routes/adminProfeco";
import basicBasketRouter from "./routes/basicBasket";
import storeBranchRoutes from "./routes/storeBranchRoutes";
import adminPromotionRoutes from "./routes/adminPromotionRoutes";

import {
  getCatalogProducts,
} from "./services/productCatalogService";

import {
  productIndex,
} from "./brain/ProductIndex";

/*
 * Variables de entorno
 */
dotenv.config();

const app = express();

const PORT =
  Number(
    process.env.PORT,
  ) || 3001;

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `🚀 Listik Backend funcionando en puerto ${PORT}`,
    );
  },
);

/*
 * ==========================================
 * JSON
 * ==========================================
 *
 * express.json() debe estar antes
 * de las rutas que utilizan request.body.
 */

app.use(
  "/api/store-branches",
  storeBranchRoutes,
);

app.use(
  express.json(),
);

/*
 * ==========================================
 * PRODUCT PRICES
 * ==========================================
 */

app.use(
  "/api/product-prices",
  productPriceRoutes,
);

/*
 * ==========================================
 * PROFECO ADMIN
 * ==========================================
 */

app.use(
  "/api/admin/profeco",
  adminProfecoRouter,
);

/*
 * ==========================================
 * CANASTA BÁSICA
 * ==========================================
 *
 * Calcula los 24 productos de primera
 * necesidad usando los precios disponibles
 * en el municipio y estado seleccionados.
 */

app.use(
  "/api/basic-basket",
  basicBasketRouter,
);

/*
 * ==========================================
 * RUTA PRINCIPAL
 * ==========================================
 */

app.get(
  "/",
  (_request, response) => {
    response.json({
      message:
        "Listik Backend funcionando",
    });
  },
);

/*
 * ==========================================
 * HEALTH CHECK
 * ==========================================
 */

app.get(
  "/api/health",
  (_request, response) => {
    response.json({
      ok: true,

      message:
        "Listik API funcionando",
    });
  },
);

/*
 * ==========================================
 * RUTAS DE LA API
 * ==========================================
 */

/*
 * Tickets
 *
 * OCR + análisis del ticket.
 */

app.use(
  "/api/tickets",
  ticketRoutes,
);

app.use(
  "/api/admin/promotions",
  adminPromotionRoutes,
);

/*
 * Listik Brain
 *
 * Identificación inteligente
 * de productos.
 */

app.use(
  "/api/brain",
  brainRoutes,
);

/*
 * Brain Queue / Learning
 *
 * Productos pendientes,
 * aprobaciones y rechazos.
 */

app.use(
  "/api/learning",
  learningRoutes,
);

/*
 * Smart Suggestions
 *
 * Prioridad:
 *
 * Brain Memory
 * ↓
 * Catálogo
 * ↓
 * Reglas
 */

app.use(
  "/api/suggestions",
  suggestionRoutes,
);

/*
 * Ticket Prices
 *
 * Guarda precios confirmados
 * provenientes de tickets.
 */

app.use(
  "/api/ticket-prices",
  ticketPriceRoutes,
);

/*
 * ==========================================
 * CATÁLOGO
 * ==========================================
 */

/*
 * Obtener productos
 * disponibles en el catálogo.
 */

app.get(
  "/api/catalog/products",
  async (
    _request,
    response,
  ) => {
    try {
      const products =
        await getCatalogProducts();

      response.json({
        ok: true,

        total:
          products.length,

        products,
      });
    } catch (error) {
      console.error(
        "Error al consultar productos:",
        error,
      );

      response
        .status(500)
        .json({
          ok: false,

          error:
            error instanceof Error
              ? error.message
              : "No se pudo cargar el catálogo.",
        });
    }
  },
);

/*
 * ==========================================
 * LISTIK BRAIN INDEX
 * ==========================================
 */

/*
 * Cargar catálogo en memoria
 * para que Listik Brain pueda
 * hacer búsquedas rápidamente.
 */

async function initializeCatalog() {
  try {
    const products =
      await getCatalogProducts();

    productIndex.load(
      products,
    );

    console.log(
      `📦 Índice cargado correctamente (${productIndex.size()} productos)`,
    );

    console.log(
      `✅ Catálogo inicializado (${productIndex.size()} productos)`,
    );
  } catch (error) {
    console.error(
      "❌ Error cargando catálogo:",
      error,
    );
  }
}

/*
 * ==========================================
 * INICIAR SERVIDOR
 * ==========================================
 */

app.listen(
  PORT,
  async () => {
    console.log(
      `🚀 Servidor iniciado en http://localhost:${PORT}`,
    );

    console.log(
      `🧺 Canasta Básica disponible en http://localhost:${PORT}/api/basic-basket`,
    );

    await initializeCatalog();
  },
);