import {
  importProfeco,
} from "./profecoImporter";

async function main() {
  const filePath =
    process.argv[2];

  if (!filePath) {
    throw new Error(
      "Debes indicar la ruta del CSV de PROFECO.",
    );
  }

  /*
   * SEGUNDA IMPORTACIÓN CONTROLADA
   *
   * Ya comprobamos correctamente:
   * products
   * product_presentations
   * stores
   * prices
   *
   * Ahora ampliamos la muestra.
   */
  await importProfeco({
    filePath,

    maxProducts: 100,

    maxRows: 50_000,

    maxPrices: 1_000,
  });
}

main().catch(
  (error) => {
    console.error("");
    console.error(
      "❌ PROFECO IMPORT ERROR",
    );

    console.error(
      error,
    );

    process.exit(1);
  },
);