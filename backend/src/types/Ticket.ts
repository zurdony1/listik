export interface TicketItem {

  rawCode?: string;

  rawName: string;

  quantity: number;

  unitPrice: number;

  totalPrice: number;

}

export interface Ticket {

  store: string;

  branch: string;

  purchaseDate: string;

  subtotal: number;

  taxes: number;

  total: number;

  items: TicketItem[];

}