import {
  supabase,
} from "../lib/supabase";

export interface MonthlyBudget {
  id: string;
  user_id: string;
  year: number;
  month: number;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface SaveMonthlyBudgetInput {
  year: number;
  month: number;
  amount: number;
}

export async function getMonthlyBudget(
  year: number,
  month: number,
): Promise<MonthlyBudget | null> {
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
    return null;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "monthly_budgets",
      )
      .select(`
        id,
        user_id,
        year,
        month,
        amount,
        created_at,
        updated_at
      `)
      .eq(
        "user_id",
        user.id,
      )
      .eq(
        "year",
        year,
      )
      .eq(
        "month",
        month,
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id:
      String(
        data.id,
      ),

    user_id:
      String(
        data.user_id,
      ),

    year:
      Number(
        data.year,
      ),

    month:
      Number(
        data.month,
      ),

    amount:
      Number(
        data.amount,
      ),

    created_at:
      String(
        data.created_at,
      ),

    updated_at:
      String(
        data.updated_at,
      ),
  };
}

export async function saveMonthlyBudget(
  input: SaveMonthlyBudgetInput,
): Promise<MonthlyBudget> {
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

  const amount =
    Number(
      input.amount,
    );

  if (
    !Number.isFinite(
      amount,
    ) ||
    amount <= 0
  ) {
    throw new Error(
      "Escribe un presupuesto válido.",
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "monthly_budgets",
      )
      .upsert(
        {
          user_id:
            user.id,

          year:
            input.year,

          month:
            input.month,

          amount,

          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            "user_id,year,month",
        },
      )
      .select(`
        id,
        user_id,
        year,
        month,
        amount,
        created_at,
        updated_at
      `)
      .single();

  if (error) {
    throw error;
  }

  return {
    id:
      String(
        data.id,
      ),

    user_id:
      String(
        data.user_id,
      ),

    year:
      Number(
        data.year,
      ),

    month:
      Number(
        data.month,
      ),

    amount:
      Number(
        data.amount,
      ),

    created_at:
      String(
        data.created_at,
      ),

    updated_at:
      String(
        data.updated_at,
      ),
  };
}