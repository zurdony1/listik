import { supabase } from "../services/supabase";

export interface BrainActivityPoint {
  date: string;
  memories: number;
}

export async function getBrainActivity(
  days = 7,
): Promise<BrainActivityPoint[]> {
  const startDate = new Date();

  startDate.setDate(
    startDate.getDate() - (days - 1),
  );

  startDate.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("brain_memory")
    .select("created_at")
    .gte(
      "created_at",
      startDate.toISOString(),
    )
    .order("created_at");

  if (error) {
    throw error;
  }

  const counters = new Map<
    string,
    number
  >();

  for (let index = 0; index < days; index++) {
    const date = new Date(startDate);

    date.setDate(
      startDate.getDate() + index,
    );

    const key = date
      .toISOString()
      .slice(0, 10);

    counters.set(key, 0);
  }

  for (const row of data ?? []) {
    const key = String(
      row.created_at,
    ).slice(0, 10);

    counters.set(
      key,
      (counters.get(key) ?? 0) + 1,
    );
  }

  return Array.from(
    counters.entries(),
  ).map(([date, memories]) => ({
    date,
    memories,
  }));
}