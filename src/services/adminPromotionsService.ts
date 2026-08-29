export interface PromotionCsvRow {
  storeName: string;
  branchName: string | null;
  productName: string;
  brand: string | null;
  regularPrice: number | null;
  promotionalPrice: number;
  startDate: string | null;
  endDate: string | null;
  imageUrl: string | null;
  promoType: string | null;
  promoText: string | null;
  promoUnit: string | null;
  isSponsored: boolean;
  priority: number;
  externalReference: string | null;
}

export interface DetectedPromotionCandidate {
  rawText: string;
  productName: string;
  regularPrice: number | null;
  promotionalPrice: number;
  promoType: string;
  promoText: string | null;
  unit: string | null;
  confidence: number;
  segmentIndex: number;
  imageUrl: string | null;
}

export interface PromotionFlyerAnalysis {
  rawText: string;

  candidates:
    DetectedPromotionCandidate[];

  summary: {
    detected: number;
    segments: number;
  };
}

export interface PromotionImageUploadResult {
  url: string;
  path: string;
}

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

/*
 * ==========================================
 * ANALIZAR FOLLETO
 * ==========================================
 */

export async function analyzePromotionImage(
  file: File,
) {
  const formData =
    new FormData();

  formData.append(
    "flyer",
    file,
  );

  const response =
    await fetch(
      `${API_URL}/api/admin/promotions/analyze-image`,
      {
        method: "POST",
        body: formData,
      },
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.ok
  ) {
    throw new Error(
      data.error ??
        "No se pudo analizar el folleto.",
    );
  }

  return data as {
    ok: true;

    analysis:
      PromotionFlyerAnalysis;
  };
}

/*
 * ==========================================
 * SUBIR IMAGEN
 * ==========================================
 */

export async function uploadPromotionImage(
  file: File,
) {
  const formData =
    new FormData();

  formData.append(
    "image",
    file,
  );

  const response =
    await fetch(
      `${API_URL}/api/admin/promotions/upload-image`,
      {
        method: "POST",
        body: formData,
      },
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.ok
  ) {
    throw new Error(
      data.error ??
        "No se pudo subir la imagen de la promoción.",
    );
  }

  return data as {
    ok: true;

    image:
      PromotionImageUploadResult;
  };
}

/*
 * ==========================================
 * IMPORTAR PROMOCIONES
 * ==========================================
 */

export async function importPromotionRows(
  rows:
    PromotionCsvRow[],
) {
  const response =
    await fetch(
      `${API_URL}/api/admin/promotions/import`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            rows,
          }),
      },
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.ok
  ) {
    throw new Error(
      data.error ??
        "No se pudieron importar las promociones.",
    );
  }

  return data as {
    ok: true;

    imported: number;

    errors: {
      rowNumber: number;
      reason: string;
    }[];
  };
}

/*
 * ==========================================
 * CARGAR PROMOCIONES
 * ==========================================
 */

export async function getAdminPromotions() {
  const response =
    await fetch(
      `${API_URL}/api/admin/promotions`,
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.ok
  ) {
    throw new Error(
      data.error ??
        "No se pudieron cargar las promociones.",
    );
  }

  return data.promotions as
    unknown[];
}

/*
 * ==========================================
 * CAMBIAR ESTADO
 * ==========================================
 */

export async function setPromotionStatus(
  promotionId: string,

  status:
    | "approved"
    | "paused",
) {
  const response =
    await fetch(
      `${API_URL}/api/admin/promotions/${encodeURIComponent(
        promotionId,
      )}/status`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            status,
          }),
      },
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.ok
  ) {
    throw new Error(
      data.error ??
        "No se pudo actualizar la promoción.",
    );
  }

  return data as {
    ok: true;
  };
}

/*
 * ==========================================
 * ELIMINAR PROMOCIONES
 * ==========================================
 */

export async function deletePromotions(
  promotionIds:
    string[],
) {
  const response =
    await fetch(
      `${API_URL}/api/admin/promotions/delete`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            promotionIds,
          }),
      },
    );

  const contentType =
    response.headers.get(
      "content-type",
    );

  if (
    !contentType?.includes(
      "application/json",
    )
  ) {
    const text =
      await response.text();

    console.error(
      "Respuesta no JSON eliminando promociones:",
      text,
    );

    throw new Error(
      "El backend no tiene disponible la ruta para eliminar promociones.",
    );
  }

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.ok
  ) {
    throw new Error(
      data.error ??
        "No se pudieron eliminar las promociones.",
    );
  }

  return data as {
    ok: true;
    deleted: number;
  };
}