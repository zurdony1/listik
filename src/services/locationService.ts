import {
  supabase,
} from "../lib/supabase";

/*
 * ==========================================
 * UBICACIÓN DISPONIBLE
 * ==========================================
 */

export interface AvailableLocation {
  state: string;

  municipality:
    string;
}

/*
 * ==========================================
 * FILA CRUDA DEL RPC
 * ==========================================
 */

interface RawLocationRow {
  state:
    | string
    | null;

  municipality:
    | string
    | null;
}

/*
 * ==========================================
 * NORMALIZAR TEXTO
 * ==========================================
 */

function cleanText(
  value:
    | string
    | null,
) {
  return (
    value
      ?.trim() ??
    ""
  );
}

/*
 * ==========================================
 * OBTENER UBICACIONES DISPONIBLES
 * ==========================================
 */

export async function getAvailableLocations(): Promise<
  AvailableLocation[]
> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "get_available_locations",
    );

  if (
    error
  ) {
    console.error(
      "❌ Error cargando ubicaciones disponibles:",
      error,
    );

    throw new Error(
      "No pudimos cargar las zonas disponibles de Listik.",
    );
  }

  const rows =
    (
      data ??
      []
    ) as RawLocationRow[];

  const locations:
    AvailableLocation[] =
    [];

  const seen =
    new Set<
      string
    >();

  for (
    const row
    of rows
  ) {
    const state =
      cleanText(
        row.state,
      );

    const municipality =
      cleanText(
        row.municipality,
      );

    if (
      !state ||
      !municipality
    ) {
      continue;
    }

    const key =
      `${state.toLowerCase()}::${municipality.toLowerCase()}`;

    if (
      seen.has(
        key,
      )
    ) {
      continue;
    }

    seen.add(
      key,
    );

    locations.push({
      state,

      municipality,
    });
  }

  return locations.sort(
    (
      a,
      b,
    ) => {
      const stateCompare =
        a.state.localeCompare(
          b.state,
          "es-MX",
          {
            sensitivity:
              "base",
          },
        );

      if (
        stateCompare !==
        0
      ) {
        return stateCompare;
      }

      return a.municipality.localeCompare(
        b.municipality,
        "es-MX",
        {
          sensitivity:
            "base",
        },
      );
    },
  );
}