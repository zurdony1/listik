import { supabase } from "../services/supabase";

export interface BrainLearning {

  id: string;

  rawName: string;

  storeName: string | null;

  confidence: number;

  createdAt: string;

}

export async function getLatestLearning() {

  const { data, error } =
    await supabase

      .from("brain_memory")

      .select(`
        id,
        raw_name,
        store_name,
        confidence,
        created_at
      `)

      .order("created_at", {
        ascending: false,
      })

      .limit(10);

  if (error) throw error;

  return (data ?? []).map((item) => ({

    id: item.id,

    rawName: item.raw_name,

    storeName: item.store_name,

    confidence: item.confidence,

    createdAt: item.created_at,

  }));

}