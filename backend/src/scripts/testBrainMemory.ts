import "dotenv/config";

import {
  saveBrainMemory,
} from "../services/brainMemoryService";

async function main() {
  try {
    const memory =
      await saveBrainMemory({
        rawName: "600ML PEPSI",

        rawCode:
          "980007627",

        storeName:
          "Sam's Club",

        productId:
          "c44fc019-4e27-42ee-ab3f-d7ef1678d2e4",

        presentationId:
          "86766957-04ca-422a-9f5c-d2f696a25446",

        confidence: 100,

        source: "code",

        accepted: true,
      });

    console.log(
      "🧠 Memoria guardada:",
      memory,
    );
  } catch (error) {
    console.error(
      "❌ Error:",
      error,
    );
  }
}

main();