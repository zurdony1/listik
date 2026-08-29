import {
  supabase,
} from "../lib/supabase";

/*
 * ==========================================
 * TIPOS
 * ==========================================
 */

export interface ShoppingList {
  id: string;

  userId: string;

  name: string;

  isDefault: boolean;

  createdAt: string;

  updatedAt: string;
}

export interface ShoppingListItem {
  id: string;

  listId: string;

  productId: string;

  presentationId:
    | string
    | null;

  quantity: number;

  isActive: boolean;

  createdAt: string;

  updatedAt: string;
}

/*
 * ==========================================
 * TIPOS CRUDOS DE SUPABASE
 * ==========================================
 */

interface RawShoppingList {
  id: string;

  user_id: string;

  name: string;

  is_default: boolean;

  created_at: string;

  updated_at: string;
}

interface RawShoppingListItem {
  id: string;

  list_id: string;

  product_id: string;

  presentation_id:
    | string
    | null;

  quantity: number;

  is_active: boolean;

  created_at: string;

  updated_at: string;
}

/*
 * ==========================================
 * NORMALIZADORES
 * ==========================================
 */

function normalizeShoppingList(
  row: RawShoppingList,
): ShoppingList {
  return {
    id:
      String(
        row.id,
      ),

    userId:
      String(
        row.user_id,
      ),

    name:
      row.name,

    isDefault:
      Boolean(
        row.is_default,
      ),

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

function normalizeShoppingListItem(
  row: RawShoppingListItem,
): ShoppingListItem {
  return {
    id:
      String(
        row.id,
      ),

    listId:
      String(
        row.list_id,
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

    quantity:
      Number(
        row.quantity,
      ),

    isActive:
      Boolean(
        row.is_active,
      ),

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

/*
 * ==========================================
 * OBTENER USUARIO ACTUAL
 * ==========================================
 */

async function getCurrentUser() {
  const {
    data,
    error,
  } =
    await supabase.auth.getUser();

  if (error) {
    throw new Error(
      `No se pudo obtener el usuario: ${error.message}`,
    );
  }

  if (!data.user) {
    throw new Error(
      "Debes iniciar sesión para utilizar tu lista.",
    );
  }

  return data.user;
}

/*
 * ==========================================
 * OBTENER LISTA PREDETERMINADA
 * ==========================================
 */

export async function getDefaultShoppingList():
  Promise<
    ShoppingList | null
  > {
  const user =
    await getCurrentUser();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "shopping_lists",
      )
      .select(`
        id,
        user_id,
        name,
        is_default,
        created_at,
        updated_at
      `)
      .eq(
        "user_id",
        user.id,
      )
      .eq(
        "is_default",
        true,
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo consultar tu lista: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return normalizeShoppingList(
    data as RawShoppingList,
  );
}

/*
 * ==========================================
 * CREAR LISTA PREDETERMINADA
 * ==========================================
 */

export async function createDefaultShoppingList():
  Promise<ShoppingList> {
  const user =
    await getCurrentUser();

  /*
   * Antes de crearla volvemos a comprobar
   * por seguridad que no exista.
   */

  const existing =
    await getDefaultShoppingList();

  if (existing) {
    return existing;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "shopping_lists",
      )
      .insert({
        user_id:
          user.id,

        name:
          "Mi lista",

        is_default:
          true,
      })
      .select(`
        id,
        user_id,
        name,
        is_default,
        created_at,
        updated_at
      `)
      .single();

  if (error) {
    throw new Error(
      `No se pudo crear tu lista: ${error.message}`,
    );
  }

  return normalizeShoppingList(
    data as RawShoppingList,
  );
}

/*
 * ==========================================
 * OBTENER O CREAR LISTA PREDETERMINADA
 * ==========================================
 *
 * Esta será una de las funciones principales.
 *
 * Usuario entra
 * ↓
 * buscamos Mi lista
 * ↓
 * existe -> devolver
 * ↓
 * no existe -> crear
 */

export async function getOrCreateDefaultShoppingList():
  Promise<ShoppingList> {
  const existing =
    await getDefaultShoppingList();

  if (existing) {
    return existing;
  }

  return createDefaultShoppingList();
}

/*
 * ==========================================
 * OBTENER PRODUCTOS DE UNA LISTA
 * ==========================================
 */

export async function getShoppingListItems(
  listId: string,
): Promise<
  ShoppingListItem[]
> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "shopping_list_items",
      )
      .select(`
        id,
        list_id,
        product_id,
        presentation_id,
        quantity,
        is_active,
        created_at,
        updated_at
      `)
      .eq(
        "list_id",
        listId,
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        },
      );

  if (error) {
    throw new Error(
      `No se pudieron cargar los productos de tu lista: ${error.message}`,
    );
  }

  return (
    data ??
    []
  ).map(
    (
      row,
    ) =>
      normalizeShoppingListItem(
        row as RawShoppingListItem,
      ),
  );
}

/*
 * ==========================================
 * BUSCAR ITEM EXISTENTE
 * ==========================================
 */

async function findExistingItem(
  listId: string,
  productId: string,
  presentationId:
    | string
    | null,
): Promise<
  ShoppingListItem | null
> {
  let query =
    supabase
      .from(
        "shopping_list_items",
      )
      .select(`
        id,
        list_id,
        product_id,
        presentation_id,
        quantity,
        is_active,
        created_at,
        updated_at
      `)
      .eq(
        "list_id",
        listId,
      )
      .eq(
        "product_id",
        productId,
      );

  /*
   * presentation_id puede ser NULL.
   */

  if (
    presentationId
  ) {
    query =
      query.eq(
        "presentation_id",
        presentationId,
      );
  } else {
    query =
      query.is(
        "presentation_id",
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

  if (error) {
    throw new Error(
      `No se pudo consultar el producto de la lista: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return normalizeShoppingListItem(
    data as RawShoppingListItem,
  );
}

/*
 * ==========================================
 * AGREGAR PRODUCTO
 * ==========================================
 *
 * Si ya existe:
 *
 * cantidad + 1
 * is_active = true
 *
 * Si no:
 *
 * crea el producto.
 */

export async function addShoppingListItem(
  listId: string,
  productId: string,
  presentationId:
    | string
    | null = null,
): Promise<ShoppingListItem> {
  const existing =
    await findExistingItem(
      listId,
      productId,
      presentationId,
    );

  /*
   * ========================================
   * YA EXISTE
   * ========================================
   */

  if (existing) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "shopping_list_items",
        )
        .update({
          quantity:
            existing.quantity +
            1,

          is_active:
            true,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          existing.id,
        )
        .select(`
          id,
          list_id,
          product_id,
          presentation_id,
          quantity,
          is_active,
          created_at,
          updated_at
        `)
        .single();

    if (error) {
      throw new Error(
        `No se pudo actualizar el producto: ${error.message}`,
      );
    }

    return normalizeShoppingListItem(
      data as RawShoppingListItem,
    );
  }

  /*
   * ========================================
   * NUEVO PRODUCTO
   * ========================================
   */

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "shopping_list_items",
      )
      .insert({
        list_id:
          listId,

        product_id:
          productId,

        presentation_id:
          presentationId,

        quantity:
          1,

        is_active:
          true,
      })
      .select(`
        id,
        list_id,
        product_id,
        presentation_id,
        quantity,
        is_active,
        created_at,
        updated_at
      `)
      .single();

  if (error) {
    throw new Error(
      `No se pudo agregar el producto: ${error.message}`,
    );
  }

  return normalizeShoppingListItem(
    data as RawShoppingListItem,
  );
}

/*
 * ==========================================
 * CAMBIAR CANTIDAD
 * ==========================================
 */

export async function updateShoppingListItemQuantity(
  itemId: string,
  quantity: number,
): Promise<ShoppingListItem> {
  /*
   * Nunca permitimos 0 o negativos aquí.
   *
   * Para eliminar utilizaremos
   * removeShoppingListItem().
   */

  const safeQuantity =
    Math.max(
      1,
      Math.floor(
        quantity,
      ),
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "shopping_list_items",
      )
      .update({
        quantity:
          safeQuantity,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        itemId,
      )
      .select(`
        id,
        list_id,
        product_id,
        presentation_id,
        quantity,
        is_active,
        created_at,
        updated_at
      `)
      .single();

  if (error) {
    throw new Error(
      `No se pudo cambiar la cantidad: ${error.message}`,
    );
  }

  return normalizeShoppingListItem(
    data as RawShoppingListItem,
  );
}

/*
 * ==========================================
 * ACTIVAR / DESACTIVAR PRODUCTO
 * ==========================================
 *
 * Esta función es importante para
 * "Mi lista habitual".
 *
 * Ejemplo:
 *
 * Leche       ✓
 * Jamón       ✓
 * Detergente  ○
 *
 * El producto sigue guardado aunque
 * no vaya a comprarse hoy.
 */

export async function setShoppingListItemActive(
  itemId: string,
  isActive: boolean,
): Promise<ShoppingListItem> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "shopping_list_items",
      )
      .update({
        is_active:
          isActive,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        itemId,
      )
      .select(`
        id,
        list_id,
        product_id,
        presentation_id,
        quantity,
        is_active,
        created_at,
        updated_at
      `)
      .single();

  if (error) {
    throw new Error(
      `No se pudo actualizar el producto: ${error.message}`,
    );
  }

  return normalizeShoppingListItem(
    data as RawShoppingListItem,
  );
}

/*
 * ==========================================
 * ELIMINAR PRODUCTO
 * ==========================================
 *
 * Esto sí lo elimina completamente
 * de la lista habitual.
 */

export async function removeShoppingListItem(
  itemId: string,
): Promise<void> {
  const {
    error,
  } =
    await supabase
      .from(
        "shopping_list_items",
      )
      .delete()
      .eq(
        "id",
        itemId,
      );

  if (error) {
    throw new Error(
      `No se pudo eliminar el producto: ${error.message}`,
    );
  }
}

/*
 * ==========================================
 * VACIAR LISTA
 * ==========================================
 *
 * IMPORTANTE:
 *
 * Esto elimina los productos de la
 * lista habitual.
 *
 * Más adelante podremos cambiar la UI
 * para pedir confirmación antes.
 */

export async function clearShoppingList(
  listId: string,
): Promise<void> {
  const {
    error,
  } =
    await supabase
      .from(
        "shopping_list_items",
      )
      .delete()
      .eq(
        "list_id",
        listId,
      );

  if (error) {
    throw new Error(
      `No se pudo vaciar la lista: ${error.message}`,
    );
  }
}

/*
 * ==========================================
 * CAMBIAR NOMBRE DE LISTA
 * ==========================================
 */

export async function renameShoppingList(
  listId: string,
  name: string,
): Promise<ShoppingList> {
  const cleanName =
    name.trim();

  if (
    !cleanName
  ) {
    throw new Error(
      "El nombre de la lista no puede estar vacío.",
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "shopping_lists",
      )
      .update({
        name:
          cleanName,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        listId,
      )
      .select(`
        id,
        user_id,
        name,
        is_default,
        created_at,
        updated_at
      `)
      .single();

  if (error) {
    throw new Error(
      `No se pudo cambiar el nombre de la lista: ${error.message}`,
    );
  }

  return normalizeShoppingList(
    data as RawShoppingList,
  );
}

/*
 * ==========================================
 * CARGAR LISTA PREDETERMINADA COMPLETA
 * ==========================================
 *
 * Esta función será muy útil para el hook.
 */

export async function loadDefaultShoppingList() {
  const list =
    await getOrCreateDefaultShoppingList();

  const items =
    await getShoppingListItems(
      list.id,
    );

  return {
    list,
    items,
  };
}