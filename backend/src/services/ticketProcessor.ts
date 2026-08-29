import { findBestProductMatch } from "../brain/matcher";

export interface TicketItem {

  name: string;

  price: number;

}

export interface TicketData {

  store: string;

  date: string;

  items: TicketItem[];

}

export async function processTicket(
  ticket: TicketData,
) {

  const matches = ticket.items.map(
    (item) => {

      const match =
        findBestProductMatch(
          item.name,
        );

      return {

        rawName: item.name,

        price: item.price,

        product: match.product,

        confidence:
          match.confidence,

      };

    },
  );

  return {

    store: ticket.store,

    date: ticket.date,

    items: matches,

  };

}