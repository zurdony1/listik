export interface TicketReaderItem {
  /*
   * Código impreso por la tienda.
   *
   * Puede ser:
   * 981050885
   * 284962
   * etc.
   */
  rawCode?: string;

  /*
   * Texto tal como fue leído
   * del ticket.
   *
   * Ejemplos:
   * TOSTITO 10 P
   * LIPTON T MI
   * MIX BARCEL 2
   */
  rawName: string;

  /*
   * Cantidad comprada.
   *
   * También puede representar
   * kilogramos:
   *
   * 0.924 kg
   */
  quantity: number;

  /*
   * Precio por unidad.
   *
   * Ejemplo:
   *
   * 2 X 152.43
   *
   * unitPrice = 152.43
   */
  unitPrice: number;

  /*
   * Importe final del renglón.
   */
  totalPrice: number;
}

export interface TicketReaderResult {
  /*
   * Cadena comercial.
   *
   * Ejemplo:
   * Sam's Club
   */
  store: string;

  /*
   * Sucursal.
   *
   * Ejemplo:
   * Caucel
   */
  branch?: string;

  /*
   * Fecha:
   * YYYY-MM-DD
   */
  purchaseDate?: string;

  /*
   * Total final del ticket.
   */
  total: number;

  /*
   * TODOS los productos
   * detectados.
   *
   * Aquí todavía NO intentamos
   * reconocer productos del
   * catálogo.
   *
   * Eso lo hará Listik Brain.
   */
  items: TicketReaderItem[];

  /*
   * Texto completo extraído
   * del ticket.
   *
   * Nos servirá muchísimo para:
   *
   * - depurar
   * - mejorar reglas
   * - entrenar Listik
   * - revisar errores de lectura
   */
  rawText?: string;
}

/*
 * Contrato que deberá cumplir
 * cualquier lector de tickets.
 *
 * Hoy:
 * LocalTicketReader
 *
 * Futuro:
 * OpenAITicketReader
 * GeminiTicketReader
 * etc.
 */
export interface TicketReader {
  analyze(
    image: Buffer,
    mimeType: string,
  ): Promise<TicketReaderResult>;
}