

export interface ProfecoRow {
  giro?: string;
  marca?: string;
  estado?: string;
  precio?: string;
  latitud?: string;
  catalogo?: string;
  longitud?: string;
  producto?: string;
  categoria?: string;
  direccion?: string;
  municipio?: string;
  presentacion?: string;
  fecha_registro?: string;
  cadena_comercial?: string;
  nombre_comercial?: string;
}

function cleanText(value?: string | null) {
  return value?.trim() || null;
}

function parseNumber(value?: string | null) {
  if (!value) return null;

  const normalized = value
    .replace("$", "")
    .replace(",", "")
    .trim();

  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function parseProfecoDate(value?: string | null) {
  if (!value) return null;

  const clean = value.trim();

  // PROFECO: 2026/05/16
  const match = clean.match(
    /^(\d{4})[/-](\d{2})[/-](\d{2})$/
  );

  if (!match) return null;

  const [, year, month, day] = match;

  return `${year}-${month}-${day}`;
}

export function normalizeProfecoRow(row: ProfecoRow) {
  return {
    product: {
      name: cleanText(row.producto),
      brand:
        row.marca === "S/M"
          ? null
          : cleanText(row.marca),
      category: cleanText(
        row.categoria || row.catalogo
      ),
      presentation: cleanText(row.presentacion),
    },

    store: {
      name: cleanText(
        row.nombre_comercial ||
          row.cadena_comercial
      ),
      chain: cleanText(row.cadena_comercial),
      city: cleanText(row.municipio),
      state: cleanText(row.estado),
      address: cleanText(row.direccion),
      latitude: parseNumber(row.latitud),
      longitude: parseNumber(row.longitud),
    },

    price: {
      price: parseNumber(row.precio),
      registered_at: parseProfecoDate(
        row.fecha_registro
      ),
    },
  };
}