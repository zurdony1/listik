export interface BrandRule {
  keywords: string[];
  brand: string;
  category: string;
}

export const brandRules: BrandRule[] = [
  {
    keywords: [
      "PEPSI",
    ],
    brand: "Pepsi",
    category: "Refrescos",
  },

  {
    keywords: [
      "COCA",
      "COCA COLA",
      "COCACOLA",
    ],
    brand: "Coca-Cola",
    category: "Refrescos",
  },

  {
    keywords: [
      "TOSTITO",
      "TOSTITOS",
    ],
    brand: "Tostitos",
    category: "Botanas",
  },

  {
    keywords: [
      "LIPTON",
    ],
    brand: "Lipton",
    category: "Bebidas",
  },

  {
    keywords: [
      "SABRITAS",
    ],
    brand: "Sabritas",
    category: "Botanas",
  },

  {
    keywords: [
      "DORITOS",
    ],
    brand: "Doritos",
    category: "Botanas",
  },

  {
    keywords: [
      "LALA",
    ],
    brand: "Lala",
    category: "Lácteos",
  },

  {
    keywords: [
      "BIMBO",
    ],
    brand: "Bimbo",
    category: "Panadería",
  },

  {
    keywords: [
      "GAMESA",
    ],
    brand: "Gamesa",
    category: "Galletas",
  },
];