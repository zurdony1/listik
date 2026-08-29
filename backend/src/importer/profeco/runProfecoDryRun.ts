import {
  runProfecoDryRun,
} from "./profecoDryRun";

async function main() {
  const filePath =
    process.argv[2];

  if (!filePath) {
    throw new Error(
      "Debes indicar la ruta del CSV de PROFECO.",
    );
  }

  await runProfecoDryRun({
    filePath,

    maxRows:
      100_000,

    maxProducts:
      200,
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