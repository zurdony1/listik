import "dotenv/config";

import {
  migrateCatalog,
} from "../services/catalogMigrationService";

async function main() {
  try {
    await migrateCatalog();

    console.log(
      "🎉 Catálogo Listik migrado correctamente.",
    );

    process.exit(0);
  } catch (error) {
    console.error(
      "❌ No se pudo completar la migración:",
      error,
    );

    process.exit(1);
  }
}

main();