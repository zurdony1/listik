import {
  supabase,
} from "../lib/supabase";

export interface PromotionImportRow {
  storeName: string;

  branchName?: string | null;

  productName: string;

  brand?: string | null;

  regularPrice?: number | null;

  promotionalPrice: number;

  startDate?: string | null;

  endDate?: string | null;

  imageUrl?: string | null;

  promoType?: string | null;

  promoText?: string | null;

  isSponsored?: boolean;

  priority?: number;

  externalReference?: string | null;
}

export interface PromotionImportError {
  rowNumber: number;

  reason: string;

  row:
    PromotionImportRow;
}

export interface PromotionImportResult {
  imported: number;

  errors:
    PromotionImportError[];
}

const allowedPromoTypes =
  new Set([
    "price",
    "percentage",
    "2x1",
    "3x2",
    "bundle",
    "coupon",
    "msi",
    "points",
    "other",
  ]);

function normalizeText(
  value:
    string |
    null |
    undefined,
) {
  return (
    value
      ?.trim() ??
    ""
  );
}

function nullableText(
  value:
    string |
    null |
    undefined,
) {
  const cleaned =
    normalizeText(
      value,
    );

  return cleaned
    ? cleaned
    : null;
}

function normalizePromoType(
  value:
    string |
    null |
    undefined,
) {
  const cleaned =
    normalizeText(
      value,
    )
      .toLowerCase();

  if (
    allowedPromoTypes.has(
      cleaned,
    )
  ) {
    return cleaned;
  }

  return "price";
}

function normalizeDate(
  value:
    string |
    null |
    undefined,
  fallback:
    string |
    null,
) {
  const cleaned =
    normalizeText(
      value,
    );

  if (!cleaned) {
    return fallback;
  }

  const parsed =
    new Date(
      cleaned,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return fallback;
  }

  return parsed.toISOString();
}

async function findStore(
  storeName:
    string,
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "stores",
      )
      .select(`
        id,
        name
      `)
      .ilike(
        "name",
        storeName.trim(),
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo buscar la tienda: ${error.message}`,
    );
  }

  return data;
}

async function findBranch(
  storeId:
    string,
  branchName:
    string,
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "store_branches",
      )
      .select(`
        id,
        name
      `)
      .eq(
        "store_id",
        storeId,
      )
      .ilike(
        "name",
        branchName.trim(),
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo buscar la sucursal: ${error.message}`,
    );
  }

  return data;
}

async function findProduct(
  productName:
    string,
  brand?:
    string |
    null,
) {
  let query =
    supabase
      .from(
        "products",
      )
      .select(`
        id,
        name,
        brand
      `)
      .ilike(
        "name",
        `%${productName.trim()}%`,
      );

  const cleanedBrand =
    normalizeText(
      brand,
    );

  if (
    cleanedBrand
  ) {
    query =
      query.ilike(
        "brand",
        `%${cleanedBrand}%`,
      );
  }

  const {
    data,
    error,
  } =
    await query
      .limit(
        1,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo buscar el producto: ${error.message}`,
    );
  }

  return data;
}

export async function importPromotions(
  rows:
    PromotionImportRow[],
): Promise<
  PromotionImportResult
> {
  const errors:
    PromotionImportError[] =
    [];

  let imported =
    0;

  for (
    let index = 0;
    index <
    rows.length;
    index++
  ) {
    const row =
      rows[index];

    const rowNumber =
      index + 2;

    try {
      const storeName =
        normalizeText(
          row.storeName,
        );

      const productName =
        normalizeText(
          row.productName,
        );

      const promotionalPrice =
        Number(
          row.promotionalPrice,
        );

      if (!storeName) {
        throw new Error(
          "storeName es obligatorio.",
        );
      }

      if (!productName) {
        throw new Error(
          "productName es obligatorio.",
        );
      }

      if (
        !Number.isFinite(
          promotionalPrice,
        ) ||
        promotionalPrice <=
          0
      ) {
        throw new Error(
          "promotionalPrice es inválido.",
        );
      }

      const store =
        await findStore(
          storeName,
        );

      if (!store) {
        throw new Error(
          `No existe la tienda "${storeName}".`,
        );
      }

      const branchName =
        nullableText(
          row.branchName,
        );

      let branchId:
        string |
        null =
        null;

      if (
        branchName
      ) {
        const branch =
          await findBranch(
            String(
              store.id,
            ),
            branchName,
          );

        if (
          branch
        ) {
          branchId =
            String(
              branch.id,
            );
        }
      }

      const product =
        await findProduct(
          productName,
          row.brand,
        );

      const startDate =
        normalizeDate(
          row.startDate,
          new Date()
            .toISOString(),
        );

      const endDate =
        normalizeDate(
          row.endDate,
          null,
        );

      const regularPrice =
        row.regularPrice ===
          null ||
        row.regularPrice ===
          undefined ||
        row.regularPrice ===
          0
          ? null
          : Number(
              row.regularPrice,
            );

      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            "store_promotions",
          )
          .insert({
            store_id:
              String(
                store.id,
              ),

            store_branch_id:
              branchId,

            product_id:
              product?.id
                ? String(
                    product.id,
                  )
                : null,

            title:
              productName,

            description:
              nullableText(
                row.promoText,
              ),

            image_url:
              nullableText(
                row.imageUrl,
              ),

            regular_price:
              regularPrice,

            promotional_price:
              promotionalPrice,

            starts_at:
              startDate,

            ends_at:
              endDate,

            status:
              "approved",

            is_sponsored:
              row.isSponsored ===
              true,

            priority:
              Number(
                row.priority ??
                0,
              ),

            promo_type:
              normalizePromoType(
                row.promoType,
              ),

            promo_text:
              nullableText(
                row.promoText,
              ),

            source:
              "csv",

            external_reference:
              nullableText(
                row.externalReference,
              ),

            updated_at:
              new Date()
                .toISOString(),
          });

      if (
        insertError
      ) {
        throw new Error(
          insertError.message,
        );
      }

      imported++;
    } catch (
      error
    ) {
      errors.push({
        rowNumber,

        reason:
          error instanceof Error
            ? error.message
            : "Error procesando la promoción.",

        row,
      });
    }
  }

  return {
    imported,

    errors,
  };
}

export async function getAdminPromotions() {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "store_promotions",
      )
      .select(`
        id,
        title,
        image_url,
        regular_price,
        promotional_price,
        starts_at,
        ends_at,
        status,
        is_sponsored,
        promo_type,
        promo_text,
        source,
        priority,
        stores (
          id,
          name
        ),
        store_branches (
          id,
          name
        )
      `)
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        200,
      );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data ?? [];
}

export async function updatePromotionStatus(
  promotionId:
    string,
  status:
    "approved" |
    "paused",
) {
  const {
    error,
  } =
    await supabase
      .from(
        "store_promotions",
      )
      .update({
        status,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        promotionId,
      );

  if (error) {
    throw new Error(
      error.message,
    );
  }
}

/*
 * ==========================================
 * ELIMINAR PROMOCIONES
 * ==========================================
 */

export async function deletePromotions(
  promotionIds:
    string[],
) {
  const ids =
    [
      ...new Set(
        promotionIds
          .map(
            (
              id,
            ) =>
              String(
                id,
              ).trim(),
          )
          .filter(
            Boolean,
          ),
      ),
    ];

  if (
    ids.length ===
    0
  ) {
    return 0;
  }

  console.log(
    "🗑️ Eliminando promociones:",
    ids,
  );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "store_promotions",
      )
      .delete()
      .in(
        "id",
        ids,
      )
      .select(
        "id",
      );

  if (
    error
  ) {
    console.error(
      "Error Supabase eliminando promociones:",
      error,
    );

    throw new Error(
      error.message,
    );
  }

  const deleted =
    data?.length ??
    0;

  console.log(
    `✅ ${deleted} promoción(es) eliminadas.`,
  );

  return deleted;
}