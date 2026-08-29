import {
  supabase,
} from "../lib/supabase";

export interface ConfirmedTicketPriceItem {
  productId: string;

  presentationId?:
    | string
    | null;

  rawName: string;

  quantity: number;

  unitPrice: number;
}

export interface SaveTicketPricesInput {
  /*
   * El frontend puede enviar los IDs ya
   * confirmados por el usuario.
   *
   * Si no vienen, el backend intenta resolverlos
   * contra entidades EXISTENTES.
   *
   * Importante:
   * este servicio YA NO crea tiendas nuevas
   * desde texto OCR.
   */
  storeId?:
    | string
    | null;

  storeBranchId?:
    | string
    | null;

  storeName: string;

  branch?:
    | string
    | null;

  purchaseDate?:
    | string
    | null;

  items:
    ConfirmedTicketPriceItem[];
}

export interface SavedTicketPrice {
  id: string;

  productId: string;

  presentationId:
    | string
    | null;

  storeId: string;

  storeBranchId:
    | string
    | null;

  price: number;

  branch:
    | string
    | null;

  observedAt:
    | string
    | null;
}

interface StoreRow {
  id: string;

  name: string;
}

interface StoreBranchRow {
  id: string;

  store_id:
    | string
    | null;

  name: string;
}

/*
 * ==========================================
 * NORMALIZACIÓN
 * ==========================================
 */

function cleanText(
  value?:
    | string
    | null,
) {
  return String(
    value ??
      "",
  )
    .trim()
    .replace(
      /\s+/g,
      " ",
    );
}

function normalizeKey(
  value?:
    | string
    | null,
) {
  return cleanText(
    value,
  )
    .toLocaleLowerCase(
      "es-MX",
    )
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .trim()
    .replace(
      /\s+/g,
      " ",
    );
}

function normalizeBranch(
  branch?:
    | string
    | null,
) {
  const cleaned =
    cleanText(
      branch,
    );

  return cleaned
    ? cleaned
    : null;
}

/*
 * ==========================================
 * TIENDA
 * ==========================================
 */

async function getStoreById(
  storeId: string,
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
      .eq(
        "id",
        storeId,
      )
      .maybeSingle();

  if (
    error
  ) {
    throw new Error(
      `No se pudo consultar la tienda: ${error.message}`,
    );
  }

  return (
    data ??
    null
  ) as StoreRow | null;
}

async function findExistingStore(
  storeName: string,
) {
  const cleanedName =
    cleanText(
      storeName,
    );

  if (
    !cleanedName
  ) {
    return null;
  }

  /*
   * Primero buscamos el nombre tal como
   * viene confirmado por el frontend.
   */
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
        cleanedName,
      )
      .limit(
        10,
      );

  if (
    error
  ) {
    throw new Error(
      `No se pudo buscar la tienda: ${error.message}`,
    );
  }

  const stores =
    (
      data ??
      []
    ) as StoreRow[];

  if (
    stores.length ===
    0
  ) {
    return null;
  }

  const normalizedTarget =
    normalizeKey(
      cleanedName,
    );

  const exactNormalized =
    stores.find(
      (
        store,
      ) =>
        normalizeKey(
          store.name,
        ) ===
        normalizedTarget,
    );

  return (
    exactNormalized ??
    stores[0] ??
    null
  );
}

async function resolveStore(
  input:
    SaveTicketPricesInput,
) {
  if (
    input.storeId
  ) {
    const byId =
      await getStoreById(
        input.storeId,
      );

    if (
      !byId
    ) {
      throw new Error(
        "La tienda seleccionada ya no existe.",
      );
    }

    return byId;
  }

  const existing =
    await findExistingStore(
      input.storeName,
    );

  if (
    !existing
  ) {
    throw new Error(
      `No encontramos "${input.storeName}" en el catálogo de tiendas. Confirma la tienda antes de guardar el ticket.`,
    );
  }

  return existing;
}

/*
 * ==========================================
 * SUCURSAL
 * ==========================================
 */

async function getBranchById(
  branchId: string,
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
        store_id,
        name
      `)
      .eq(
        "id",
        branchId,
      )
      .maybeSingle();

  if (
    error
  ) {
    throw new Error(
      `No se pudo consultar la sucursal: ${error.message}`,
    );
  }

  return (
    data ??
    null
  ) as StoreBranchRow | null;
}

async function findExistingBranch(
  storeId: string,
  branchName:
    | string
    | null,
) {
  if (
    !branchName
  ) {
    return null;
  }

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
        store_id,
        name
      `)
      .eq(
        "store_id",
        storeId,
      )
      .ilike(
        "name",
        branchName,
      )
      .limit(
        10,
      );

  if (
    error
  ) {
    throw new Error(
      `No se pudo buscar la sucursal: ${error.message}`,
    );
  }

  const branches =
    (
      data ??
      []
    ) as StoreBranchRow[];

  if (
    branches.length ===
    0
  ) {
    return null;
  }

  const target =
    normalizeKey(
      branchName,
    );

  const exactNormalized =
    branches.find(
      (
        branch,
      ) =>
        normalizeKey(
          branch.name,
        ) ===
        target,
    );

  return (
    exactNormalized ??
    branches[0] ??
    null
  );
}

async function resolveBranch(
  input:
    SaveTicketPricesInput,
  storeId:
    string,
) {
  if (
    input.storeBranchId
  ) {
    const branch =
      await getBranchById(
        input.storeBranchId,
      );

    if (
      !branch
    ) {
      throw new Error(
        "La sucursal seleccionada ya no existe.",
      );
    }

    if (
      String(
        branch.store_id ??
          "",
      ) !==
      String(
        storeId,
      )
    ) {
      throw new Error(
        "La sucursal seleccionada no pertenece a la tienda confirmada.",
      );
    }

    return branch;
  }

  const branchText =
    normalizeBranch(
      input.branch,
    );

  if (
    !branchText
  ) {
    return null;
  }

  /*
   * No creamos sucursales desde OCR.
   * Solo relacionamos contra una existente.
   */
  return findExistingBranch(
    storeId,
    branchText,
  );
}

/*
 * ==========================================
 * FECHA
 * ==========================================
 */

function getObservedAt(
  purchaseDate?:
    | string
    | null,
) {
  if (
    !purchaseDate
  ) {
    return new Date()
      .toISOString();
  }

  const parsed =
    new Date(
      purchaseDate,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return new Date()
      .toISOString();
  }

  return parsed
    .toISOString();
}

/*
 * ==========================================
 * PRECIO DUPLICADO
 * ==========================================
 *
 * Coincidencia:
 * producto
 * presentación
 * tienda
 * sucursal ID
 * precio
 * fecha
 * source=ticket
 */

async function ticketPriceExists(
  input: {
    productId: string;

    presentationId:
      | string
      | null;

    storeId: string;

    storeBranchId:
      | string
      | null;

    price: number;

    observedAt: string;
  },
) {
  let query =
    supabase
      .from(
        "prices",
      )
      .select(
        "id",
      )
      .eq(
        "product_id",
        input.productId,
      )
      .eq(
        "store_id",
        input.storeId,
      )
      .eq(
        "price",
        input.price,
      )
      .eq(
        "observed_at",
        input.observedAt,
      )
      .eq(
        "source",
        "ticket",
      );

  if (
    input.presentationId
  ) {
    query =
      query.eq(
        "presentation_id",
        input.presentationId,
      );
  } else {
    query =
      query.is(
        "presentation_id",
        null,
      );
  }

  if (
    input.storeBranchId
  ) {
    query =
      query.eq(
        "store_branch_id",
        input.storeBranchId,
      );
  } else {
    query =
      query.is(
        "store_branch_id",
        null,
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

  if (
    error
  ) {
    throw new Error(
      `No se pudo comprobar precio duplicado: ${error.message}`,
    );
  }

  return Boolean(
    data,
  );
}

/*
 * ==========================================
 * GUARDAR PRECIOS CONFIRMADOS
 * ==========================================
 */

export async function saveTicketPrices(
  input:
    SaveTicketPricesInput,
): Promise<
  SavedTicketPrice[]
> {
  if (
    !input.storeName
      ?.trim() &&
    !input.storeId
  ) {
    throw new Error(
      "La tienda es obligatoria.",
    );
  }

  if (
    !Array.isArray(
      input.items,
    ) ||
    input.items.length ===
      0
  ) {
    throw new Error(
      "El ticket no contiene productos confirmados.",
    );
  }

  /*
   * ------------------------------------------
   * 1. RESOLVER TIENDA EXISTENTE
   * ------------------------------------------
   */

  const store =
    await resolveStore(
      input,
    );

  /*
   * ------------------------------------------
   * 2. RESOLVER SUCURSAL EXISTENTE
   * ------------------------------------------
   */

  const branch =
    await resolveBranch(
      input,
      String(
        store.id,
      ),
    );

  const branchText =
    branch?.name ??
    normalizeBranch(
      input.branch,
    );

  const storeBranchId =
    branch?.id
      ? String(
          branch.id,
        )
      : null;

  /*
   * Si el usuario confirmó texto de sucursal
   * pero no pudimos empatarlo con una sucursal
   * real, detenemos el guardado.
   */
  if (
    normalizeBranch(
      input.branch,
    ) &&
    !storeBranchId
  ) {
    throw new Error(
      `No encontramos la sucursal "${input.branch}" dentro de ${store.name}. Confirma la sucursal antes de guardar el ticket.`,
    );
  }

  const observedAt =
    getObservedAt(
      input.purchaseDate,
    );

  /*
   * ------------------------------------------
   * 3. VALIDAR PRODUCTOS
   * ------------------------------------------
   */

  const validItems =
    input.items.filter(
      (
        item,
      ) =>
        Boolean(
          item.productId,
        ) &&
        Number.isFinite(
          item.unitPrice,
        ) &&
        item.unitPrice >
          0,
    );

  if (
    validItems.length ===
    0
  ) {
    throw new Error(
      "No hay precios válidos para guardar.",
    );
  }

  /*
   * ------------------------------------------
   * 4. DUPLICADOS + FILAS
   * ------------------------------------------
   */

  const rowsToInsert:
    {
      product_id: string;

      presentation_id:
        | string
        | null;

      store_id: string;

      store_branch_id:
        | string
        | null;

      /*
       * Conservamos también el texto de sucursal
       * para compatibilidad con partes anteriores
       * de Listik.
       */
      store_branch:
        | string
        | null;

      price: number;

      source:
        "ticket";

      observed_at:
        string;

      updated_at:
        string;
    }[] =
    [];

  let skippedDuplicates =
    0;

  for (
    const item
    of validItems
  ) {
    const presentationId =
      item.presentationId ??
      null;

    const exists =
      await ticketPriceExists({
        productId:
          item.productId,

        presentationId,

        storeId:
          String(
            store.id,
          ),

        storeBranchId,

        price:
          item.unitPrice,

        observedAt,
      });

    if (
      exists
    ) {
      skippedDuplicates++;

      console.log(
        `⏭️ Precio duplicado omitido: ${item.rawName} $${item.unitPrice}`,
      );

      continue;
    }

    rowsToInsert.push({
      product_id:
        item.productId,

      presentation_id:
        presentationId,

      store_id:
        String(
          store.id,
        ),

      store_branch_id:
        storeBranchId,

      store_branch:
        branchText,

      price:
        item.unitPrice,

      source:
        "ticket",

      observed_at:
        observedAt,

      updated_at:
        new Date()
          .toISOString(),
    });
  }

  /*
   * ------------------------------------------
   * 5. TODO ERA DUPLICADO
   * ------------------------------------------
   */

  if (
    rowsToInsert.length ===
    0
  ) {
    console.log(
      `🛡️ No se insertaron precios nuevos. ${skippedDuplicates} duplicados omitidos.`,
    );

    return [];
  }

  /*
   * ------------------------------------------
   * 6. INSERTAR
   * ------------------------------------------
   */

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "prices",
      )
      .insert(
        rowsToInsert,
      )
      .select(`
        id,
        product_id,
        presentation_id,
        store_id,
        store_branch_id,
        store_branch,
        price,
        source,
        observed_at
      `);

  if (
    error
  ) {
    throw new Error(
      `No se pudieron guardar los precios: ${error.message}`,
    );
  }

  console.log(
    `💲 ${data?.length ?? 0} precios nuevos guardados desde ticket.`,
  );

  if (
    skippedDuplicates >
    0
  ) {
    console.log(
      `⏭️ ${skippedDuplicates} precios duplicados omitidos.`,
    );
  }

  /*
   * ------------------------------------------
   * 7. RESPUESTA
   * ------------------------------------------
   */

  return (
    data ??
    []
  ).map(
    (
      row,
    ) => ({
      id:
        String(
          row.id,
        ),

      productId:
        String(
          row.product_id,
        ),

      presentationId:
        row.presentation_id
          ? String(
              row.presentation_id,
            )
          : null,

      storeId:
        String(
          row.store_id,
        ),

      storeBranchId:
        row.store_branch_id
          ? String(
              row.store_branch_id,
            )
          : null,

      price:
        Number(
          row.price,
        ),

      branch:
        row.store_branch ??
        null,

      observedAt:
        row.observed_at ??
        null,
    }),
  );
}
