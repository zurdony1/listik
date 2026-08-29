import {
  openai,
} from "./openai";

export interface VisionTicketItem {
  rawCode: string | null;

  rawName: string;

  quantity: number;

  unitPrice: number;

  totalPrice: number;
}

export interface VisionTicketResult {
  store: string;

  branch: string | null;

  purchaseDate: string | null;

  total: number;

  items: VisionTicketItem[];
}

interface AnalyzeTicketVisionInput {
  image: Buffer;

  mimeType: string;
}

const ticketSchema = {
  type: "object",

  additionalProperties: false,

  properties: {
    store: {
      type: "string",
    },

    branch: {
      type: [
        "string",
        "null",
      ],
    },

    purchaseDate: {
      type: [
        "string",
        "null",
      ],
      description:
        "Fecha de compra en formato YYYY-MM-DD cuando sea legible.",
    },

    total: {
      type: "number",
    },

    items: {
      type: "array",

      items: {
        type: "object",

        additionalProperties: false,

        properties: {
          rawCode: {
            type: [
              "string",
              "null",
            ],
          },

          rawName: {
            type: "string",
          },

          quantity: {
            type: "number",
          },

          unitPrice: {
            type: "number",
          },

          totalPrice: {
            type: "number",
          },
        },

        required: [
          "rawCode",
          "rawName",
          "quantity",
          "unitPrice",
          "totalPrice",
        ],
      },
    },
  },

  required: [
    "store",
    "branch",
    "purchaseDate",
    "total",
    "items",
  ],
} as const;

export async function analyzeTicketWithVision(
  input: AnalyzeTicketVisionInput,
): Promise<VisionTicketResult> {
  const base64Image =
    input.image.toString(
      "base64",
    );

  const imageUrl =
    `data:${input.mimeType};base64,${base64Image}`;

  console.log(
    "👁️ Enviando ticket a Vision...",
  );

  const response =
    await openai.responses.create({
      /*
       * Modelo con visión.
       */
      model:
        "gpt-5.6",

      input: [
        {
          role:
            "system",

          content: [
            {
              type:
                "input_text",

              text: `
Eres el lector de tickets de supermercado de Listik.

Tu trabajo es EXTRAER datos visibles del ticket.
No debes intentar relacionar productos con nuestro catálogo.
Eso ocurrirá después en Listik Brain.

REGLAS IMPORTANTES:

1. Lee TODO el ticket, de arriba hacia abajo.

2. Extrae TODOS los renglones que representen productos comprados.

3. No omitas un producto solo porque:
   - el nombre esté abreviado,
   - sea difícil de entender,
   - no conozcas la marca,
   - esté vendido por peso,
   - tenga cantidad en una línea diferente,
   - tenga código interno,
   - tenga precio o cantidad en la siguiente línea.

4. Conserva rawName lo más parecido posible al texto impreso.

Ejemplos válidos:
"MIX BARCEL 2"
"TOSTITO 10 P"
"JUMEX LATA"
"MMGALLETACHO"
"CONCHAS GOUR"
"24/250ML FRU"
"9PZ DONA PRE"
"24/400ML MUL"
"LIPTON T MI"
"600ML PEPSI"
"MM 40/355ML"

5. Si existe un código al inicio del producto, guárdalo en rawCode.

6. IMPORTANTE CON PRODUCTOS MULTILÍNEA:

Ejemplo:

LIPTON T MI
2 X $152.43     $304.86

Debe convertirse en:

rawName = "LIPTON T MI"
quantity = 2
unitPrice = 152.43
totalPrice = 304.86

7. Productos por peso:

Ejemplo:

MMGALLETACHO
1.000 KGS A 138.10/KG $138.11

quantity debe representar los kilogramos cuando sea posible.

quantity = 1
unitPrice = 138.10
totalPrice = 138.11

Otro ejemplo:

CONCHAS GOUR
0.924 KGS A 94.12/KG $86.96

quantity = 0.924
unitPrice = 94.12
totalPrice = 86.96

8. NO conviertas estas líneas en productos:
   - CUPON
   - CUPONERA
   - DESCUENTO
   - AJUSTE
   - SUBTOTAL
   - TOTAL
   - CAMBIO
   - EFECTIVO
   - TARJETA
   - BANCOMER
   - IVA
   - RFC
   - SOCIO
   - autorización
   - datos fiscales
   - datos bancarios

9. No inventes productos que no estén visibles.

10. Si no puedes leer perfectamente un nombre, conserva el texto aproximado en rawName en lugar de eliminar el artículo.

11. total debe ser el TOTAL FINAL de compra visible en el ticket.

12. store debe ser la cadena o supermercado.

13. branch debe ser la sucursal si está visible.

14. purchaseDate debe ser YYYY-MM-DD si la fecha está visible. Si no lo está, usa null.

OBJETIVO PRINCIPAL:
Preferimos detectar un producto abreviado y mandarlo después a revisión humana antes que perder completamente ese producto.
`,
            },
          ],
        },

        {
          role:
            "user",

          content: [
            {
              type:
                "input_text",

              text:
                "Analiza esta imagen del ticket y extrae todos los productos comprados.",
            },

            {
              type:
                "input_image",

              image_url:
                imageUrl,

              /*
               * Para tickets queremos
               * buena lectura del texto.
               */
              detail:
                "high",
            },
          ],
        },
      ],

      text: {
        format: {
          type:
            "json_schema",

          name:
            "listik_ticket",

          strict:
            true,

          schema:
            ticketSchema,
        },
      },
    });

  const outputText =
    response.output_text;

  if (!outputText) {
    throw new Error(
      "OpenAI no devolvió datos del ticket.",
    );
  }

  let parsed:
    VisionTicketResult;

  try {
    parsed =
      JSON.parse(
        outputText,
      ) as VisionTicketResult;
  } catch (error) {
    console.error(
      "❌ Respuesta Vision inválida:",
      outputText,
    );

    throw new Error(
      "No se pudo interpretar la respuesta del lector de tickets.",
    );
  }

  /*
   * Protección básica:
   * nunca continuar si items
   * no es realmente un array.
   */
  if (
    !Array.isArray(
      parsed.items,
    )
  ) {
    throw new Error(
      "El lector no devolvió una lista válida de productos.",
    );
  }

  console.log(
    "👁️ TICKET VISION RESULT:",
    {
      store:
        parsed.store,

      branch:
        parsed.branch,

      purchaseDate:
        parsed.purchaseDate,

      total:
        parsed.total,

      items:
        parsed.items.length,
    },
  );

  console.log(
    "🧾 PRODUCTOS EXTRAÍDOS:",
  );

  parsed.items.forEach(
    (
      item,
      index,
    ) => {
      console.log(
        `${index + 1}.`,
        {
          code:
            item.rawCode,

          name:
            item.rawName,

          quantity:
            item.quantity,

          unitPrice:
            item.unitPrice,

          totalPrice:
            item.totalPrice,
        },
      );
    },
  );

  return parsed;
}