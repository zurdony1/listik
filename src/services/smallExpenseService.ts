import {
  supabase,
} from "../lib/supabase";

export interface SmallExpense {
  id: string;
  user_id: string;
  concept: string;
  category: string;
  amount: number;
  spent_at: string;
  created_at: string;
}

export interface CreateSmallExpenseInput {
  concept: string;
  category: string;
  amount: number;
  spentAt?: string;
}

/*
 * ==========================================
 * CREAR GASTO HORMIGA
 * ==========================================
 */

export async function createSmallExpense(
  input: CreateSmallExpenseInput,
): Promise<SmallExpense> {
  const {
    data: authData,
    error: authError,
  } =
    await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const user =
    authData.user;

  if (!user) {
    throw new Error(
      "Debes iniciar sesión.",
    );
  }

  const concept =
    input.concept.trim();

  const category =
    input.category.trim() ||
    "Otros";

  const amount =
    Number(
      input.amount,
    );

  if (!concept) {
    throw new Error(
      "Escribe el concepto del gasto.",
    );
  }

  if (
    !Number.isFinite(
      amount,
    ) ||
    amount <= 0
  ) {
    throw new Error(
      "Escribe un importe válido.",
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "small_expenses",
      )
      .insert({
        user_id:
          user.id,

        concept,

        category,

        amount,

        spent_at:
          input.spentAt ??
          new Date()
            .toISOString(),
      })
      .select(`
        id,
        user_id,
        concept,
        category,
        amount,
        spent_at,
        created_at
      `)
      .single();

  if (error) {
    throw error;
  }

  return {
    ...data,

    id:
      String(
        data.id,
      ),

    user_id:
      String(
        data.user_id,
      ),

    concept:
      String(
        data.concept,
      ),

    category:
      String(
        data.category,
      ),

    amount:
      Number(
        data.amount,
      ),

    spent_at:
      String(
        data.spent_at,
      ),

    created_at:
      String(
        data.created_at,
      ),
  };
}

/*
 * ==========================================
 * OBTENER GASTOS HORMIGA
 * ==========================================
 */

export async function getSmallExpenses(
  fromDate?: string,
  toDate?: string,
): Promise<SmallExpense[]> {
  const {
    data: authData,
    error: authError,
  } =
    await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const user =
    authData.user;

  if (!user) {
    return [];
  }

  let query =
    supabase
      .from(
        "small_expenses",
      )
      .select(`
        id,
        user_id,
        concept,
        category,
        amount,
        spent_at,
        created_at
      `)
      .eq(
        "user_id",
        user.id,
      )
      .order(
        "spent_at",
        {
          ascending:
            false,
        },
      );

  if (fromDate) {
    query =
      query.gte(
        "spent_at",
        fromDate,
      );
  }

  if (toDate) {
    query =
      query.lt(
        "spent_at",
        toDate,
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    throw error;
  }

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

      user_id:
        String(
          row.user_id,
        ),

      concept:
        String(
          row.concept,
        ),

      category:
        String(
          row.category,
        ),

      amount:
        Number(
          row.amount,
        ),

      spent_at:
        String(
          row.spent_at,
        ),

      created_at:
        String(
          row.created_at,
        ),
    }),
  );
}

/*
 * ==========================================
 * ELIMINAR GASTO HORMIGA
 * ==========================================
 */

export async function deleteSmallExpense(
  id: string,
) {
  const {
    error,
  } =
    await supabase
      .from(
        "small_expenses",
      )
      .delete()
      .eq(
        "id",
        id,
      );

  if (error) {
    throw error;
  }
}