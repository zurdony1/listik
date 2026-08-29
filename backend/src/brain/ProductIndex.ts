import type {
  CatalogProduct,
} from "../services/productCatalogService";

import {
  normalizeText,
} from "./normalize";

export interface IndexedProduct
  extends CatalogProduct {
  normalizedName: string;
}

class ProductIndex {
  private products:
    IndexedProduct[] = [];

  /*
   * Cargar catálogo completo.
   */
  load(
    products: CatalogProduct[],
  ) {
    this.products =
      products.map(
        (product) => ({
          ...product,

          normalizedName:
            normalizeText(
              product.name,
            ),
        }),
      );

    console.log(
      `📦 Índice cargado correctamente (${this.products.length} productos)`,
    );
  }

  /*
   * Agregar o actualizar
   * un producto en tiempo real.
   */
  addProduct(
    product: CatalogProduct,
  ): IndexedProduct {
    const indexedProduct: IndexedProduct =
      {
        ...product,

        normalizedName:
          normalizeText(
            product.name,
          ),
      };

    const existingIndex =
      this.products.findIndex(
        (currentProduct) =>
          currentProduct.id ===
          product.id,
      );

    /*
     * Si ya existe,
     * actualizamos el registro.
     */
    if (existingIndex >= 0) {
      this.products[
        existingIndex
      ] = indexedProduct;

      console.log(
        `🧠 Producto actualizado en ProductIndex: ${product.name}`,
      );

      return indexedProduct;
    }

    /*
     * Si no existe,
     * lo agregamos.
     */
    this.products.push(
      indexedProduct,
    );

    console.log(
      `🧠 Producto agregado a ProductIndex: ${product.name}`,
    );

    console.log(
      `📦 Total en índice: ${this.products.length}`,
    );

    return indexedProduct;
  }

  /*
   * Buscar por ID.
   */
  getById(
    id: string,
  ): IndexedProduct | undefined {
    return this.products.find(
      (product) =>
        product.id === id,
    );
  }

  /*
   * Obtener catálogo completo.
   */
  getAll():
    IndexedProduct[] {
    return this.products;
  }

  /*
   * Número de productos
   * actualmente indexados.
   */
  size(): number {
    return this.products.length;
  }

  /*
   * Vaciar índice.
   */
  clear(): void {
    this.products = [];
  }
}

export const productIndex =
  new ProductIndex();