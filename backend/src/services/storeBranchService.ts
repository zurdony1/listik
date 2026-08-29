import {
  supabase,
} from "../lib/supabase";

export interface CreateStoreBranchInput {
  storeId: string;
  name: string;
  municipality: string;
  state: string;
  latitude: number;
  longitude: number;
}

function cleanText(
  value: string,
) {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeKey(
  value: string,
) {
  return cleanText(value)
    .toLocaleLowerCase("es-MX")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function validateCoordinates(
  latitude: number,
  longitude: number,
) {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error("La latitud es inválida.");
  }

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("La longitud es inválida.");
  }
}

export async function createStoreBranch(
  input: CreateStoreBranchInput,
) {
  const storeId =
    cleanText(input.storeId);

  const name =
    cleanText(input.name);

  const municipality =
    cleanText(input.municipality);

  const state =
    cleanText(input.state);

  validateCoordinates(
    input.latitude,
    input.longitude,
  );

  const {
    data: store,
    error: storeError,
  } =
    await supabase
      .from("stores")
      .select("id, name")
      .eq("id", storeId)
      .maybeSingle();

  if (storeError) {
    throw new Error(
      `No se pudo validar la tienda: ${storeError.message}`,
    );
  }

  if (!store) {
    throw new Error(
      "La tienda seleccionada no existe.",
    );
  }

  const {
    data: existingRows,
    error: existingError,
  } =
    await supabase
      .from("store_branches")
      .select(`
        id,
        store_id,
        name,
        municipality,
        state,
        latitude,
        longitude
      `)
      .eq("store_id", storeId)
      .limit(100);

  if (existingError) {
    throw new Error(
      `No se pudieron revisar las sucursales existentes: ${existingError.message}`,
    );
  }

  const nameKey =
    normalizeKey(name);

  const municipalityKey =
    normalizeKey(municipality);

  const existing =
    (existingRows ?? []).find(
      (row) =>
        normalizeKey(
          String(row.name ?? ""),
        ) === nameKey &&
        normalizeKey(
          String(
            row.municipality ?? "",
          ),
        ) === municipalityKey,
    );

  if (existing) {
    return {
      id: String(existing.id),
      storeId: String(existing.store_id),
      name: String(existing.name),
      municipality:
        existing.municipality ?? null,
      state:
        existing.state ?? null,
      latitude:
        existing.latitude === null
          ? null
          : Number(existing.latitude),
      longitude:
        existing.longitude === null
          ? null
          : Number(existing.longitude),
      created: false,
    };
  }

  const {
    data,
    error,
  } =
    await supabase
      .from("store_branches")
      .insert({
        store_id: storeId,
        name,
        municipality,
        state,
        latitude: input.latitude,
        longitude: input.longitude,
      })
      .select(`
        id,
        store_id,
        name,
        municipality,
        state,
        latitude,
        longitude
      `)
      .single();

  if (error) {
    throw new Error(
      `No se pudo registrar la sucursal: ${error.message}`,
    );
  }

  return {
    id: String(data.id),
    storeId: String(data.store_id),
    name: String(data.name),
    municipality:
      data.municipality ?? null,
    state:
      data.state ?? null,
    latitude:
      data.latitude === null
        ? null
        : Number(data.latitude),
    longitude:
      data.longitude === null
        ? null
        : Number(data.longitude),
    created: true,
  };
}
