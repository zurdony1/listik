import { normalizeText } from "./normalize";

export interface ScoreInput {
  rawName: string;
  productName: string;
}

export function calculateScore({
  rawName,
  productName,
}: ScoreInput): number {

  const raw = normalizeText(rawName);

  const product = normalizeText(productName);

  let score = 0;

  // Marca Coca Cola
  if (
    raw.includes("coca") &&
    product.includes("coca")
  ) {
    score += 40;
  }

  // Marca Lala
  if (
    raw.includes("lala") &&
    product.includes("lala")
  ) {
    score += 40;
  }

  // Marca Bimbo
  if (
    raw.includes("bimbo") &&
    product.includes("bimbo")
  ) {
    score += 40;
  }

  // Presentación
  const rawSize =
    raw.match(/\d+\s?(ml|l|kg|g)/);

  const productSize =
    product.match(/\d+\s?(ml|l|kg|g)/);

  if (
    rawSize &&
    productSize &&
    rawSize[0] === productSize[0]
  ) {
    score += 30;
  }

  // Coincidencia de palabras
  const rawWords =
    raw.split(" ");

  const productWords =
    product.split(" ");

  let matches = 0;

  for (const word of rawWords) {
    if (productWords.includes(word)) {
      matches++;
    }
  }

  score += Math.min(matches * 10, 30);

  return Math.min(score, 100);
}