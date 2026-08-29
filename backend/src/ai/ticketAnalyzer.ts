export interface AnalyzeTicketResult {
  store: string;
  branch: string;
  date: string;
  total: number;

  items: TicketItem[];
}

export interface TicketItem {
  id: string;

  rawName: string;

  suggestedProductId?: string;

  suggestedProductName?: string;

  confidence: number;

  quantity: number;

  unitPrice: number;

  subtotal: number;

  status:
    | "pending"
    | "confirmed"
    | "new-product";
}

export async function analyzeTicketImage(
  image: Buffer,
): Promise<AnalyzeTicketResult> {

  console.log(
    "Analizando ticket...",
    image.length,
    "bytes",
  );

  // Aquí irá GPT en el siguiente paso.

  return {
    store: "Chedraui",

    branch: "Mérida Centro",

    date: "2026-08-06",

    total: 99.80,

    items: [
      {
        id: crypto.randomUUID(),

        rawName: "COCA COLA 600 ML",

        suggestedProductId: "1",

        suggestedProductName:
          "Coca Cola 600 ml",

        confidence: 98,

        quantity: 1,

        unitPrice: 18.70,

        subtotal: 18.70,

        status: "pending",
      },

      {
        id: crypto.randomUUID(),

        rawName: "LECHE LALA ENTERA",

        suggestedProductId: "2",

        suggestedProductName:
          "Leche Lala 1L",

        confidence: 91,

        quantity: 1,

        unitPrice: 34.20,

        subtotal: 34.20,

        status: "pending",
      },

      {
        id: crypto.randomUUID(),

        rawName: "PAN BIMBO GRANDE",

        confidence: 45,

        quantity: 1,

        unitPrice: 46.90,

        subtotal: 46.90,

        status: "new-product",
      },
    ],
  };
}