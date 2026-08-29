import type { Ticket } from "../types/Ticket";

export const samsTicket: Ticket = {

  store: "Sam's Club",

  branch: "Caucel",

  purchaseDate: "2026-08-07",

  subtotal: 1762.08,

  taxes: 281.93,

  total: 2044.01,

  items: [

    {
      rawCode: "980007627",
      rawName: "600ML PEPSI",
      quantity: 2,
      unitPrice: 96.16,
      totalPrice: 192.32,
    },

    {
      rawName: "TOSTITO 10 P",
      quantity: 1,
      unitPrice: 121.75,
      totalPrice: 121.75,
    },

    {
      rawName: "LIPTON T MI",
      quantity: 2,
      unitPrice: 152.43,
      totalPrice: 304.86,
    }

  ]

};