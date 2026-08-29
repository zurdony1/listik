import {
  apiFetch,
} from "./http";

export interface CatalogPresentation {
  id: string;

  presentationName: string;

  sizeValue: number | null;

  sizeUnit: string | null;

  unitsPerPackage: number;

  packageType: string | null;
}

export interface CatalogProduct {
  id: string;

  name: string;

  brand: string | null;

  category: string | null;

  barcode: string | null;

  presentations:
    CatalogPresentation[];
}

interface CatalogProductsResponse {
  ok: boolean;

  total: number;

  products:
    CatalogProduct[];
}

/*
 * ==========================================
 * CARGAR CATÁLOGO COMPLETO
 * ==========================================
 */

export async function getCatalogProducts() {
  return apiFetch<CatalogProductsResponse>(
    "/api/catalog/products",
  );
}

/*
 * ==========================================
 * BUSCAR PRODUCTOS
 * ==========================================
 *
 * Por ahora descargamos el catálogo
 * y filtramos del lado del frontend.
 *
 * Como Listik todavía tiene pocos
 * productos, esto funciona perfecto.
 *
 * Más adelante podremos crear:
 *
 * GET /api/catalog/search?q=...
 */

export async function searchCatalogProducts(
  search: string,
) {
  const response =
    await getCatalogProducts();

  const normalizedSearch =
    search
      .trim()
      .toLowerCase();

  if (!normalizedSearch) {
    return response.products;
  }

  return response.products.filter(
    (product) => {
      const presentationText =
        (
          product.presentations ??
          []
        )
          .map(
            (presentation) =>
              presentation.presentationName,
          )
          .join(" ");

      const searchable =
        [
          product.name,
          product.brand,
          product.category,
          product.barcode,
          presentationText,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

      return searchable.includes(
        normalizedSearch,
      );
    },
  );
}