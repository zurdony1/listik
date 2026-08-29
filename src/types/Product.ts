export interface Store {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
}

export interface ProductPresentation {
  id: string;

  productId: string;

  presentationName: string;

  sizeValue: number | null;

  sizeUnit: string | null;

  unitsPerPackage: number;

  packageType: string | null;
}

export interface ProductPrice {
  price: number;

  stores: Store | null;

  presentationId: string | null;

  observedAt: string | null;

  source: string | null;

  storeBranch: string | null;
}

export interface Product {
  id: string;

  name: string;

  brand: string | null;

  category: string | null;

  barcode: string | null;

  image_url: string | null;

  prices: ProductPrice[];

  presentations: ProductPresentation[];
}