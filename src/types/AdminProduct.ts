export interface AdminProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  image_url: string | null;
}