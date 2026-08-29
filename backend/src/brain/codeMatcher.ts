import {
  ProductRepository,
} from "../repositories/ProductRepository";

export interface CodeMatchResult {
  found: boolean;

  confidence: number;

  presentation: {
    id: string;

    productId: string;

    productName: string;

    presentationName: string;

    sizeValue: number | null;

    sizeUnit: string | null;

    unitsPerPackage: number;

    packageType: string | null;
  } | null;
}

export async function findByCode(
  storeName: string,
  code: string,
): Promise<CodeMatchResult> {
  const data =
    await ProductRepository.findPresentationByCode(
      storeName,
      code,
    );

  if (!data) {
    return {
      found: false,

      confidence: 0,

      presentation: null,
    };
  }

  /*
   * ProductRepository ya devuelve
   * el producto relacionado dentro de:
   *
   * data.presentation.product
   */
  const product =
    data.presentation.product;

  /*
   * Si por algún motivo encontramos
   * presentación pero no producto,
   * no queremos considerar la
   * coincidencia como válida.
   */
  if (!product?.id) {
    console.warn(
      "⚠️ Coincidencia por código sin productId:",
      {
        storeName,
        code,

        presentationId:
          data.presentation.id,
      },
    );

    return {
      found: false,

      confidence: 0,

      presentation: null,
    };
  }

  return {
    found: true,

    confidence: 100,

    presentation: {
      /*
       * ID de product_presentations
       */
      id:
        data.presentation.id,

      /*
       * ID real de products
       */
      productId:
        product.id,

      productName:
        product.name ?? "",

      presentationName:
        data.presentation
          .presentationName,

      sizeValue:
        data.presentation
          .sizeValue,

      sizeUnit:
        data.presentation
          .sizeUnit,

      unitsPerPackage:
        data.presentation
          .unitsPerPackage,

      packageType:
        data.presentation
          .packageType,
    },
  };
}