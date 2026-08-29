import {
  supabase,
} from "../lib/supabase";

/*
 * ==========================================
 * PROMOCIÓN
 * ==========================================
 */

export interface StorePromotion {
  id: string;

  title: string;

  description:
    | string
    | null;

  imageUrl:
    | string
    | null;

  regularPrice:
    | number
    | null;

  promotionalPrice:
    number;

  startsAt:
    string;

  endsAt:
    | string
    | null;

  isSponsored:
    boolean;

  priority:
    number;

  storeId:
    | string
    | null;

  storeName:
    | string
    | null;

  branchId:
    | string
    | null;

  branchName:
    | string
    | null;

  productId:
    | string
    | null;

  presentationId:
    | string
    | null;
}

/*
 * ==========================================
 * FILA SUPABASE
 * ==========================================
 */

interface PromotionRow {
  id: string;

  title: string;

  description:
    | string
    | null;

  image_url:
    | string
    | null;

  regular_price:
    | number
    | string
    | null;

  promotional_price:
    | number
    | string;

  starts_at:
    string;

  ends_at:
    | string
    | null;

  is_sponsored:
    boolean;

  priority:
    number;

  store_id:
    | string
    | null;

  store_branch_id:
    | string
    | null;

  product_id:
    | string
    | null;

  presentation_id:
    | string
    | null;
}

/*
 * ==========================================
 * OBTENER PROMOCIONES
 * ==========================================
 */

export async function getStorePromotions(): Promise<
  StorePromotion[]
> {
  const now =
    new Date()
      .toISOString();

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
        description,
        image_url,
        regular_price,
        promotional_price,
        starts_at,
        ends_at,
        is_sponsored,
        priority,
        store_id,
        store_branch_id,
        product_id,
        presentation_id
      `)
      .eq(
        "status",
        "approved",
      )
      .lte(
        "starts_at",
        now,
      )
      .or(
        `ends_at.is.null,ends_at.gte.${now}`,
      )
      .order(
        "priority",
        {
          ascending:
            false,
        },
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        12,
      );

  if (
    error
  ) {
    throw new Error(
      `No se pudieron cargar las promociones: ${error.message}`,
    );
  }

  const rows =
    (
      data ??
      []
    ) as PromotionRow[];

  /*
   * ==========================================
   * TIENDAS
   * ==========================================
   */

  const storeIds =
    [
      ...new Set(
        rows
          .map(
            (
              row,
            ) =>
              row.store_id,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(
                value,
              ),
          ),
      ),
    ];

  const storeMap =
    new Map<
      string,
      string
    >();

  if (
    storeIds.length >
    0
  ) {
    const {
      data:
        stores,
    } =
      await supabase
        .from(
          "stores",
        )
        .select(`
          id,
          name
        `)
        .in(
          "id",
          storeIds,
        );

    for (
      const store
      of stores ??
        []
    ) {
      storeMap.set(
        String(
          store.id,
        ),
        String(
          store.name,
        ),
      );
    }
  }

  /*
   * ==========================================
   * SUCURSALES
   * ==========================================
   */

  const branchIds =
    [
      ...new Set(
        rows
          .map(
            (
              row,
            ) =>
              row.store_branch_id,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(
                value,
              ),
          ),
      ),
    ];

  const branchMap =
    new Map<
      string,
      string
    >();

  if (
    branchIds.length >
    0
  ) {
    const {
      data:
        branches,
    } =
      await supabase
        .from(
          "store_branches",
        )
        .select(`
          id,
          name
        `)
        .in(
          "id",
          branchIds,
        );

    for (
      const branch
      of branches ??
        []
    ) {
      branchMap.set(
        String(
          branch.id,
        ),
        String(
          branch.name,
        ),
      );
    }
  }

  /*
   * ==========================================
   * NORMALIZAR
   * ==========================================
   */

  return rows.map(
    (
      row,
    ) => ({
      id:
        String(
          row.id,
        ),

      title:
        row.title,

      description:
        row.description ??
        null,

      imageUrl:
        row.image_url ??
        null,

      regularPrice:
        row.regular_price ===
        null
          ? null
          : Number(
              row.regular_price,
            ),

      promotionalPrice:
        Number(
          row.promotional_price,
        ),

      startsAt:
        row.starts_at,

      endsAt:
        row.ends_at ??
        null,

      isSponsored:
        row.is_sponsored ===
        true,

      priority:
        Number(
          row.priority ??
          0,
        ),

      storeId:
        row.store_id ??
        null,

      storeName:
        row.store_id
          ? storeMap.get(
              row.store_id,
            ) ??
            null
          : null,

      branchId:
        row.store_branch_id ??
        null,

      branchName:
        row.store_branch_id
          ? branchMap.get(
              row.store_branch_id,
            ) ??
            null
          : null,

      productId:
        row.product_id ??
        null,

      presentationId:
        row.presentation_id ??
        null,
    }),
  );
}