export interface ParsedProduct {

  productName: string;

  presentation: string;

  sizeValue: number | null;

  sizeUnit: string | null;

}

export function parseProductName(
  name: string,
): ParsedProduct {

  const lower = name.toLowerCase();

  const size =
    lower.match(/(\d+(?:\.\d+)?)\s?(ml|l|kg|g)/);

  let sizeValue: number | null = null;

  let sizeUnit: string | null = null;

  if (size) {

    sizeValue = Number(size[1]);

    sizeUnit = size[2];

  }

  const cleaned = lower
    .replace(/(\d+(?:\.\d+)?)\s?(ml|l|kg|g)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {

    productName: cleaned,

    presentation: name,

    sizeValue,

    sizeUnit,

  };

}