import "dotenv/config";

import { samsTicket } from "../mock/samsTicket";
import { identifyProduct } from "../brain/productIntelligence";
import { supabase } from "../lib/supabase";

async function getStoreId(
  storeName: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("id, name")
    .ilike("name", storeName)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo buscar la tienda "${storeName}": ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return String(data.id);
}

async function main() {
  try {
    console.clear();

    console.log("");
    console.log("=================================");
    console.log("🧠 LISTIK PRODUCT INTELLIGENCE");
    console.log("=================================");
    console.log("");

    console.log(`🛒 Tienda: ${samsTicket.store}`);
    console.log(`📍 Sucursal: ${samsTicket.branch}`);
    console.log("");

    const storeId = await getStoreId(
      samsTicket.store,
    );

    if (!storeId) {
      console.log(
        `⚠️ La tienda "${samsTicket.store}" no existe todavía en la tabla stores.`,
      );

      console.log(
        "Los productos se probarán únicamente por nombre.",
      );

      console.log("");
    } else {
      console.log(
        `✅ Tienda encontrada: ${storeId}`,
      );

      console.log("");
    }

    for (const item of samsTicket.items) {
      console.log("--------------------------------");
      console.log("");

      console.log(`🧾 Producto: ${item.rawName}`);

      if (item.rawCode) {
        console.log(
          `🔢 Código: ${item.rawCode}`,
        );
      }

      console.log(
        `💲 Precio: $${item.totalPrice.toFixed(2)}`,
      );

      console.log("");

      const result = await identifyProduct({
        storeName: samsTicket.store,
        rawCode:
          storeId && item.rawCode
            ? item.rawCode
            : undefined,
        rawName: item.rawName,
      });

      console.log(
        `🔎 Fuente: ${result.source}`,
      );

      console.log(
        `🎯 Confianza: ${result.confidence}%`,
      );

      console.log("");

      if (result.result) {
        console.log("✅ Resultado:");
        console.dir(
          result.result,
          {
            depth: null,
          },
        );
      } else {
        console.log(
          "❌ No se encontró coincidencia.",
        );
      }

      console.log("");
    }

    console.log("=================================");
    console.log("✅ PRUEBA TERMINADA");
    console.log("=================================");
  } catch (error) {
    console.error("");
    console.error(
      "❌ Error ejecutando el ticket de Sam's:",
    );

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );
  }
}

main();