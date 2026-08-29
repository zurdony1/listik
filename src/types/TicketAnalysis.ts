export type TicketItemStatus =
  | "pending"
  | "confirmed"
  | "new-product";

export type TicketMatchSource =
  | "code"
  | "name"
  | "memory"
  | "manual";

export interface SuggestedProduct {
  id?: string;

  name?: string;

  productName?: string;

  presentationName?: string;

  sizeValue?: number | null;

  sizeUnit?: string | null;

  unitsPerPackage?: number;

  packageType?: string | null;
}

export interface TicketItem {
  id: string;

  rawCode?: string;

  rawName: string;

  suggestedProductId?: string;

  suggestedPresentationId?: string;

  learningId?: string | null;

  suggestedProductName?: string;

  suggestedProduct?:
    | SuggestedProduct
    | null;

  matchSource?:
    TicketMatchSource;

  confidence: number;

  /*
   * Información del Listik Brain.
   */
  brainScore?: number;

  previousMemories?: number;

  quantity: number;

  unitPrice: number;

  /*
   * Compatibilidad con
   * el formato anterior.
   */
  subtotal?: number;

  /*
   * Formato actual
   * del backend.
   */
  totalPrice?: number;

  status:
    TicketItemStatus;
}

export interface TicketAnalysis {
  store: string;

  branch?:
    | string
    | null;

  /*
   * Compatibilidad con
   * versiones anteriores.
   */
  date?: string;

  purchaseDate?:
    | string
    | null;

  total: number;

  items:
    TicketItem[];

  summary?: {
    totalItems: number;

    confirmed: number;

    pending: number;
  };
}