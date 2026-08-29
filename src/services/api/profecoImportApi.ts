import {
  supabase,
} from "../../lib/supabase";

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

export interface ProfecoPreviewRow {
  rowNumber: number;
  valid: boolean;
  errors: string[];
  producto: string;
  presentacion: string;
  marca: string;
  precio: string;
  cadena: string;
  sucursal: string;
  estado: string;
  municipio: string;
}

export interface ProfecoPreviewResult {
  fileName: string;
  fileHash: string;
  duplicate: boolean;
  previousImport:
    | {
        id: string;
        file_name: string;
        status: string;
        created_at: string;
        completed_at:
          | string
          | null;
      }
    | null;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  preview: ProfecoPreviewRow[];
}

export interface ProfecoImportResult {
  importId: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdProducts: number;
  reusedProducts: number;
  createdPresentations: number;
  reusedPresentations: number;
  createdStores: number;
  reusedStores: number;
  createdBranches: number;
  reusedBranches: number;
  insertedPrices: number;
  skippedPrices: number;
}

export interface ProfecoImportHistory {
  id: string;
  file_name: string;
  status:
    | "processing"
    | "completed"
    | "failed";
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  created_products: number;
  created_presentations: number;
  created_stores: number;
  created_branches: number;
  inserted_prices: number;
  skipped_prices: number;
  error_message:
    | string
    | null;
  created_at: string;
  completed_at:
    | string
    | null;
}

async function getAccessToken() {
  const {
    data,
  } =
    await supabase.auth.getSession();

  const token =
    data.session
      ?.access_token;

  if (!token) {
    throw new Error(
      "Necesitas iniciar sesión.",
    );
  }

  return token;
}

async function adminFetch<T>(
  path: string,
  options?: RequestInit,
) {
  const token =
    await getAccessToken();

  const response =
    await fetch(
      `${API_URL}${path}`,
      {
        ...options,
        headers: {
          Authorization:
            `Bearer ${token}`,
          ...(options?.headers ?? {}),
        },
      },
    );

  const payload =
    await response.json()
      .catch(
        () => null,
      );

  if (!response.ok) {
    throw new Error(
      payload?.message ??
        "Error comunicando con el backend.",
    );
  }

  return payload as T;
}

export async function previewProfecoCsv(
  file: File,
) {
  const formData =
    new FormData();

  formData.append(
    "file",
    file,
  );

  return adminFetch<{
    ok: boolean;
    data:
      ProfecoPreviewResult;
  }>(
    "/api/admin/profeco/preview",
    {
      method: "POST",
      body: formData,
    },
  );
}

export async function importProfecoCsv(
  file: File,
) {
  const formData =
    new FormData();

  formData.append(
    "file",
    file,
  );

  return adminFetch<{
    ok: boolean;
    data:
      ProfecoImportResult;
  }>(
    "/api/admin/profeco/import",
    {
      method: "POST",
      body: formData,
    },
  );
}

export async function getProfecoImports() {
  return adminFetch<{
    ok: boolean;
    data:
      ProfecoImportHistory[];
  }>(
    "/api/admin/profeco/imports",
  );
}
