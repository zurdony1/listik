import { normalizeText } from "./normalize";

export interface ParsedProduct {

  brand?: string;

  presentation?: string;

  category?: string;

  words: string[];

}

export function parseProduct(
  text: string,
): ParsedProduct {

  const normalized =
    normalizeText(text);

  const words =
    normalized.split(" ");

  const parsed: ParsedProduct = {

    words,

  };

  if (
    normalized.includes("coca")
  ) {

    parsed.brand =
      "Coca Cola";

  }

  if (
    normalized.includes("pepsi")
  ) {

    parsed.brand =
      "Pepsi";

  }

  if (
    normalized.includes("lala")
  ) {

    parsed.brand =
      "Lala";

  }

  const size =
    normalized.match(
      /\d+\s?(ml|l|kg|g)/,
    );

  if (size) {

    parsed.presentation =
      size[0];

  }

  return parsed;

}