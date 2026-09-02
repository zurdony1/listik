import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import ticketRoutes from "./routes/ticketRoutes";
import brainRoutes from "./routes/brainRoutes";
import learningRoutes from "./routes/learningRoutes";
import suggestionRoutes from "./routes/suggestionRoutes";
import ticketPriceRoutes from "./routes/ticketPriceRoutes";
import productPriceRoutes from "./routes/productPriceRoutes";
import productCodeRoutes from "./routes/productCodeRoutes";
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
 * ==========================================
 * VARIABLES DE ENTORNO
 * ==========================================
 */

dotenv.config();

const app = express();

const PORT =
  Number(
    process.env.PORT,
  ) || 3001;

/*
 * ==========================================
 * CORS
 * ==========================================
 *
 * IMPORTANTE:
 *
 * Este middleware debe estar ANTES
 * de todas las rutas.
 *
 * Permite:
 *
 * - Frontend local
 * - Frontend de Vercel
 */

const allowedOrigins = [
  "http://localhost:5173",
  "https://listik-beta.vercel.app",
  "https://listik.life",
];

app.use(
  cors({
    origin: (
      origin,
      callback,
    ) => {
      /*
       * Permitir peticiones sin origin:
       *
       * Postman
       * curl
       * servidor a servidor
       */
      if (
        !origin
      ) {
        callback(
          null,
          true,
        );

        return;
      }

      if (
        allowedOrigins.includes(
          origin,
        )
      ) {
        callback(
          null,
          true,
        );

        return;
      }

      console.warn(
        "⚠️ ORIGEN BLOQUEADO POR CORS:",
        origin,
      );

      callback(
        new Error(
          `Origen no permitido por CORS: ${origin}`,
        ),
      );
    },

    credentials:
      true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  }),
);

/*
 * ==========================================
 * JSON
 * ==========================================
 *
 * Debe estar antes de las rutas
 * que utilizan request.body.
 */

app.use(
  express.json(),
);

/*
 * ==========================================
 * RUTA PRINCIPAL
 * ==========================================
 */

app.get(
  "/",
  (
    _request,
    response,
  ) => {
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
  (
    _request,
    response,
  ) => {
    response.json({
      ok: true,

      message:
        "Listik API funcionando",
    });
  },
);

/*
 * ==========================================
 * STORE BRANCHES
 * ==========================================
 */

app.use(
  "/api/store-branches",
  storeBranchRoutes,
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
 * PRODUCT CODES
 * ==========================================
 *
 * Permite registrar:
 *
 * supermercado + código
 *        ↓
 * producto + presentación
 *
 * Esto permitirá que Listik aprenda
 * los códigos detectados en tickets.
 */

app.use(
  "/api/product-codes",
  productCodeRoutes,
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
 * PROMOCIONES ADMIN
 * ==========================================
 */

app.use(
  "/api/admin/promotions",
  adminPromotionRoutes,
);

/*
 * ==========================================
 * CANASTA BÁSICA
 * ==========================================
 */

app.use(
  "/api/basic-basket",
  basicBasketRouter,
);

/*
 * ==========================================
 * TICKETS
 * ==========================================
 */

app.use(
  "/api/tickets",
  ticketRoutes,
);

/*
 * ==========================================
 * LISTIK BRAIN
 * ==========================================
 */

app.use(
  "/api/brain",
  brainRoutes,
);

/*
 * ==========================================
 * LEARNING
 * ==========================================
 */

app.use(
  "/api/learning",
  learningRoutes,
);

/*
 * ==========================================
 * SUGGESTIONS
 * ==========================================
 */

app.use(
  "/api/suggestions",
  suggestionRoutes,
);

/*
 * ==========================================
 * TICKET PRICES
 * ==========================================
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
    } catch (
      error
    ) {
      console.error(
        "❌ Error al consultar productos:",
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
  } catch (
    error
  ) {
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
 *
 * SOLO UN app.listen()
 */

app.listen(
  PORT,
  "0.0.0.0",
  async () => {
    console.log(
      `🚀 Listik Backend funcionando en puerto ${PORT}`,
    );

    console.log(
      `🩺 Health check: http://localhost:${PORT}/api/health`,
    );

    console.log(
      `🧺 Canasta Básica: http://localhost:${PORT}/api/basic-basket`,
    );

    console.log(
      `🏷️ Product Codes: http://localhost:${PORT}/api/product-codes`,
    );

    await initializeCatalog();
  },
);