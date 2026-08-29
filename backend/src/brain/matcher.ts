import { productIndex } from "./ProductIndex";
import { calculateScore } from "./scoring";

export interface ProductMatchResult {
  product: ReturnType<
    typeof productIndex.getAll
  >[number] | null;

  confidence: number;
}

export function findBestProductMatch(
  rawName: string,
): ProductMatchResult {
  const products = productIndex.getAll();

  let bestProduct: ProductMatchResult["product"] =
    null;

  let bestScore = 0;

  for (const product of products) {
    const score = calculateScore({
      rawName,
      productName: product.name,
    });

    if (score > bestScore) {
      bestScore = score;
      bestProduct = product;
    }
  }

  return {
    product: bestProduct,
    confidence: bestScore,
  };
}