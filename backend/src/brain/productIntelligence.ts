import { findByCode } from "./codeMatcher";
import { findBestProductMatch } from "./matcher";
import { calculateBrainScore } from "./BrainScore";

import {
  countPreviousMemories,
  findAcceptedMemory,
} from "../services/brainMemoryService";

export interface IntelligenceInput {
  storeName?: string;

  rawCode?: string;

  rawName: string;
}

/*
 * ==========================================
 * UMBRALES DEL BRAIN
 * ==========================================
 *
 * Menos de 50:
 * no mostramos ninguna sugerencia.
 *
 * 50 - 94:
 * sugerencia para revisión humana.
 *
 * 95 - 100:
 * ticketProcessingService puede
 * confirmarlo automáticamente.
 */
const MIN_NAME_SUGGESTION_THRESHOLD =
  50;

export async function identifyProduct(
  input: IntelligenceInput,
) {
  console.log(
    "===== IDENTIFY PRODUCT =====",
  );

  console.log({
    storeName:
      input.storeName,

    rawCode:
      input.rawCode,

    rawName:
      input.rawName,
  });

  /*
   * ==========================================
   * 1. MEMORIAS PREVIAS
   * ==========================================
   */

  const previousMemories =
    await countPreviousMemories(
      input.rawName,
      input.storeName,
    );

  /*
   * ==========================================
   * 2. CÓDIGO
   * ==========================================
   *
   * Es nuestra señal más confiable.
   */

  if (
    input.rawCode?.trim() &&
    input.storeName?.trim()
  ) {
    const codeResult =
      await findByCode(
        input.storeName,
        input.rawCode,
      );

    if (
      codeResult.found &&
      codeResult.presentation
    ) {
      const brainScore =
        calculateBrainScore({
          codeMatched:
            true,

          nameConfidence:
            100,

          previousMemories,

          sameStore:
            true,

          confirmedByHuman:
            previousMemories >
            0,
        });

      console.log(
        "✅ Reconocido por código",
      );

      console.log({
        rawName:
          input.rawName,

        confidence:
          100,

        brainScore,

        previousMemories,
      });

      return {
        source:
          "code" as const,

        confidence:
          100,

        brainScore,

        previousMemories,

        result:
          codeResult.presentation,
      };
    }
  }

  /*
   * ==========================================
   * 3. BRAIN MEMORY
   * ==========================================
   *
   * Una corrección humana previamente
   * aceptada también es una señal fuerte.
   */

  const memoryResult =
    await findAcceptedMemory(
      input.rawName,
      input.storeName,
    );

  if (memoryResult) {
    const brainScore =
      calculateBrainScore({
        codeMatched:
          false,

        /*
         * La memoria aceptada corresponde
         * al texto normalizado.
         */
        nameConfidence:
          100,

        previousMemories,

        sameStore:
          Boolean(
            input.storeName?.trim(),
          ),

        confirmedByHuman:
          true,
      });

    console.log(
      `🧠 Reconocido por Brain Memory: ${input.rawName}`,
    );

    console.log({
      product:
        memoryResult.presentation
          .productName,

      presentation:
        memoryResult.presentation
          .presentationName,

      confidence:
        100,

      brainScore,

      previousMemories,
    });

    return {
      source:
        "memory" as const,

      confidence:
        100,

      brainScore,

      previousMemories,

      result:
        memoryResult.presentation,
    };
  }

  /*
   * ==========================================
   * 4. MATCHER POR NOMBRE
   * ==========================================
   */

  const nameResult =
    findBestProductMatch(
      input.rawName,
    );

  const brainScore =
    calculateBrainScore({
      codeMatched:
        false,

      nameConfidence:
        nameResult.confidence,

      previousMemories,

      sameStore:
        Boolean(
          input.storeName?.trim(),
        ),

      confirmedByHuman:
        previousMemories >
        0,
    });

  /*
   * ==========================================
   * 5. FILTRO DE CONFIANZA
   * ==========================================
   *
   * ESTE ES EL CAMBIO IMPORTANTE.
   *
   * El matcher siempre puede encontrar
   * "el menos malo".
   *
   * Pero eso NO significa que sea una
   * coincidencia útil.
   *
   * Ejemplo:
   *
   * JUMEX LATA
   * ↓
   * A.s.cor
   * 10%
   *
   * Antes:
   * devolvíamos A.s.cor.
   *
   * Ahora:
   * result = null.
   */

  const hasReliableSuggestion =
    Boolean(
      nameResult.product,
    ) &&
    nameResult.confidence >=
      MIN_NAME_SUGGESTION_THRESHOLD;

  console.log(
    "🔎 Resultado Name Matcher:",
    {
      rawName:
        input.rawName,

      candidate:
        nameResult.product
          ?.name ??
        null,

      confidence:
        nameResult.confidence,

      minimumRequired:
        MIN_NAME_SUGGESTION_THRESHOLD,

      brainScore,

      previousMemories,

      accepted:
        hasReliableSuggestion,
    },
  );

  /*
   * Coincidencia demasiado débil.
   */
  if (!hasReliableSuggestion) {
    console.log(
      "🚫 Coincidencia por nombre descartada:",
      {
        rawName:
          input.rawName,

        candidate:
          nameResult.product
            ?.name ??
          null,

        confidence:
          nameResult.confidence,
      },
    );

    return {
      source:
        "name" as const,

      /*
       * Conservamos la confianza real
       * para poder mostrar Brain Score
       * y hacer diagnóstico.
       */
      confidence:
        nameResult.confidence,

      brainScore,

      previousMemories,

      /*
       * CRÍTICO:
       * no mandamos un producto incorrecto
       * al frontend.
       */
      result:
        null,
    };
  }

  /*
   * ==========================================
   * 6. SUGERENCIA VÁLIDA
   * ==========================================
   */

  console.log(
    "✅ Coincidencia por nombre aceptada:",
    {
      rawName:
        input.rawName,

      product:
        nameResult.product
          ?.name,

      confidence:
        nameResult.confidence,

      brainScore,
    },
  );

  return {
    source:
      "name" as const,

    confidence:
      nameResult.confidence,

    brainScore,

    previousMemories,

    result:
      nameResult.product,
  };
}