import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  FileImage,
  FileSpreadsheet,
  Image as ImageIcon,
  Pause,
  Play,
  RefreshCw,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  analyzePromotionImage,
  deletePromotions,
  getAdminPromotions,
  importPromotionRows,
  setPromotionStatus,
  uploadPromotionImage,
  type DetectedPromotionCandidate,
  type PromotionCsvRow,
} from "../services/adminPromotionsService";

type ImportMode =
  | "csv"
  | "image";

interface PromotionListItem {
  id: string;

  title: string;

  image_url:
    string |
    null;

  regular_price:
    number |
    string |
    null;

  promotional_price:
    number |
    string;

  starts_at:
    string;

  ends_at:
    string |
    null;

  status: string;

  is_sponsored:
    boolean;

  promo_type:
    string |
    null;

  promo_text:
    string |
    null;

  source:
    string |
    null;

  priority:
    number;

  stores:
    | {
        id:
          string;

        name:
          string;
      }
    | {
        id:
          string;

        name:
          string;
      }[]
    | null;

  store_branches:
    | {
        id:
          string;

        name:
          string;
      }
    | {
        id:
          string;

        name:
          string;
      }[]
    | null;
}

function parseCsvLine(
  line:
    string,
) {
  const values:
    string[] =
    [];

  let current =
    "";

  let quoted =
    false;

  for (
    let index = 0;
    index <
    line.length;
    index++
  ) {
    const char =
      line[index];

    if (
      char ===
      '"'
    ) {
      if (
        quoted &&
        line[
          index + 1
        ] ===
          '"'
      ) {
        current +=
          '"';

        index++;

        continue;
      }

      quoted =
        !quoted;

      continue;
    }

    if (
      char ===
        "," &&
      !quoted
    ) {
      values.push(
        current.trim(),
      );

      current =
        "";

      continue;
    }

    current +=
      char;
  }

  values.push(
    current.trim(),
  );

  return values;
}

function normalizeHeader(
  value:
    string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      "_",
    );
}

function toNumber(
  value:
    string |
    undefined,
) {
  if (
    !value?.trim()
  ) {
    return null;
  }

  const parsed =
    Number(
      value.replace(
        /[$,\s]/g,
        "",
      ),
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function toBoolean(
  value:
    string |
    undefined,
) {
  const cleaned =
    value
      ?.trim()
      .toLowerCase();

  return (
    cleaned ===
      "true" ||
    cleaned ===
      "1" ||
    cleaned ===
      "si" ||
    cleaned ===
      "sí" ||
    cleaned ===
      "yes"
  );
}

function firstRelationName(
  relation:
    PromotionListItem[
      "stores"
    ],
) {
  if (!relation) {
    return "—";
  }

  if (
    Array.isArray(
      relation,
    )
  ) {
    return relation[0]
      ?.name ??
      "—";
  }

  return (
    relation.name ??
    "—"
  );
}

function money(
  value:
    number |
    string |
    null,
) {
  if (
    value ===
    null
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "es-MX",
    {
      style:
        "currency",

      currency:
        "MXN",
    },
  ).format(
    Number(
      value,
    ),
  );
}

export default function AdminPromotions() {
  const [
    mode,
    setMode,
  ] =
    useState<
      ImportMode
    >(
      "csv",
    );

  const [
    previewRows,
    setPreviewRows,
  ] =
    useState<
      PromotionCsvRow[]
    >([]);

  const [
    imageCandidates,
    setImageCandidates,
  ] =
    useState<
      DetectedPromotionCandidate[]
    >([]);

  const [
    promotions,
    setPromotions,
  ] =
    useState<
      PromotionListItem[]
    >([]);

  const [
    selectedPromotionIds,
    setSelectedPromotionIds,
  ] =
    useState<
      string[]
    >([]);

  const [
    deletingPromotions,
    setDeletingPromotions,
  ] =
    useState(
      false,
    );

  const [
    fileName,
    setFileName,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    imagePreviewUrl,
    setImagePreviewUrl,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    imageStoreName,
    setImageStoreName,
  ] =
    useState(
      "",
    );

  const [
    imageBranchName,
    setImageBranchName,
  ] =
    useState(
      "",
    );

  const [
    imageStartDate,
    setImageStartDate,
  ] =
    useState(
      "",
    );

  const [
    imageEndDate,
    setImageEndDate,
  ] =
    useState(
      "",
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    importing,
    setImporting,
  ] =
    useState(
      false,
    );

  const [
    analyzingImage,
    setAnalyzingImage,
  ] =
    useState(
      false,
    );

  const [
    uploadingCandidateIndex,
    setUploadingCandidateIndex,
  ] =
    useState<
      number | null
    >(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  async function loadPromotions() {
    try {
      setLoading(
        true,
      );

      setError(
        null,
      );

      const result =
        await getAdminPromotions();

      setPromotions(
        result as
          PromotionListItem[],
      );
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudieron cargar las promociones.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  useEffect(
    () => {
      void loadPromotions();
    },
    [],
  );

  useEffect(
    () => {
      return () => {
        if (
          imagePreviewUrl
        ) {
          URL.revokeObjectURL(
            imagePreviewUrl,
          );
        }
      };
    },
    [
      imagePreviewUrl,
    ],
  );

  const previewTotal =
    previewRows.length;

  const sponsoredCount =
    useMemo(
      () =>
        previewRows.filter(
          (
            row,
          ) =>
            row.isSponsored,
        ).length,
      [
        previewRows,
      ],
    );

  function resetPreview() {
    setPreviewRows(
      [],
    );

    setImageCandidates(
      [],
    );

    setFileName(
      null,
    );

    setMessage(
      null,
    );

    setError(
      null,
    );

    if (
      imagePreviewUrl
    ) {
      URL.revokeObjectURL(
        imagePreviewUrl,
      );
    }

    setImagePreviewUrl(
      null,
    );
  }

  async function handleCsvFile(
    file:
      File,
  ) {
    setError(
      null,
    );

    setMessage(
      null,
    );

    setFileName(
      file.name,
    );

    const text =
      await file.text();

    const lines =
      text
        .split(
          /\r?\n/,
        )
        .filter(
          (
            line,
          ) =>
            line.trim()
              .length >
            0,
        );

    if (
      lines.length <
      2
    ) {
      setError(
        "El CSV no contiene filas de promociones.",
      );

      return;
    }

    const headers =
      parseCsvLine(
        lines[0],
      ).map(
        normalizeHeader,
      );

    function column(
      values:
        string[],
      ...names:
        string[]
    ) {
      for (
        const name
        of names
      ) {
        const index =
          headers.indexOf(
            name,
          );

        if (
          index >=
          0
        ) {
          return (
            values[index] ??
            ""
          );
        }
      }

      return "";
    }

    const rows =
      lines
        .slice(
          1,
        )
        .map(
          (
            line,
          ) => {
            const values =
              parseCsvLine(
                line,
              );

            return {
              storeName:
                column(
                  values,
                  "store_name",
                  "tienda",
                  "supermercado",
                ),

              branchName:
                column(
                  values,
                  "branch_name",
                  "sucursal",
                ) ||
                null,

              productName:
                column(
                  values,
                  "product_name",
                  "producto",
                  "title",
                ),

              brand:
                column(
                  values,
                  "brand",
                  "marca",
                ) ||
                null,

              regularPrice:
                toNumber(
                  column(
                    values,
                    "regular_price",
                    "precio_normal",
                    "precio_regular",
                  ),
                ),

              promotionalPrice:
                toNumber(
                  column(
                    values,
                    "promo_price",
                    "promotional_price",
                    "precio_oferta",
                    "precio_promocional",
                  ),
                ) ??
                0,

              startDate:
                column(
                  values,
                  "start_date",
                  "fecha_inicio",
                ) ||
                null,

              endDate:
                column(
                  values,
                  "end_date",
                  "fecha_fin",
                  "vigencia",
                ) ||
                null,

              imageUrl:
                column(
                  values,
                  "image_url",
                  "imagen",
                  "url_imagen",
                ) ||
                null,

              promoType:
                column(
                  values,
                  "promo_type",
                  "tipo_promocion",
                ) ||
                "price",

              promoText:
                column(
                  values,
                  "promo_text",
                  "texto_promocion",
                  "descripcion",
                ) ||
                null,

              isSponsored:
                toBoolean(
                  column(
                    values,
                    "is_sponsored",
                    "patrocinado",
                  ),
                ),

              priority:
                toNumber(
                  column(
                    values,
                    "priority",
                    "prioridad",
                  ),
                ) ??
                0,

             externalReference:
  column(
    values,
    "external_reference",
    "referencia",
    "sku",
  ) ||
  null,

      promoUnit:
         column(
           values,
           "promo_unit",
            "unidad_promocion",
              "unidad",
              ) ||
               null,

} satisfies
  PromotionCsvRow;  
          },
        );

    setPreviewRows(
      rows,
    );
  }

  async function handleImageFile(
    file:
      File,
  ) {
    try {
      setAnalyzingImage(
        true,
      );

      setError(
        null,
      );

      setMessage(
        null,
      );

      setFileName(
        file.name,
      );

      if (
        imagePreviewUrl
      ) {
        URL.revokeObjectURL(
          imagePreviewUrl,
        );
      }

      setImagePreviewUrl(
        URL.createObjectURL(
          file,
        ),
      );

      const result =
        await analyzePromotionImage(
          file,
        );

      setImageCandidates(
        result.analysis
          .candidates,
      );
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo analizar la imagen.",
      );

      setImageCandidates(
        [],
      );
    } finally {
      setAnalyzingImage(
        false,
      );
    }
  }

  function updateImageCandidate(
    index:
      number,
    patch:
      Partial<
        DetectedPromotionCandidate
      >,
  ) {
    setImageCandidates(
      (
        current,
      ) =>
        current.map(
          (
            item,
            itemIndex,
          ) =>
            itemIndex ===
            index
              ? {
                  ...item,
                  ...patch,
                }
              : item,
        ),
    );
  }

  function removeImageCandidate(
    index:
      number,
  ) {
    setImageCandidates(
      (
        current,
      ) =>
        current.filter(
          (
            _item,
            itemIndex,
          ) =>
            itemIndex !==
            index,
        ),
    );
  }


  async function handleCandidateImageUpload(
    index:
      number,

    file:
      File,
  ) {
    try {
      setUploadingCandidateIndex(
        index,
      );

      setError(
        null,
      );

      const result =
        await uploadPromotionImage(
          file,
        );

      updateImageCandidate(
        index,
        {
          imageUrl:
            result.image.url,
        },
      );
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo subir la imagen de la promoción.",
      );
    } finally {
      setUploadingCandidateIndex(
        null,
      );
    }
  }

  async function handleImportRows(
    rows:
      PromotionCsvRow[],
  ) {
    if (
      rows.length ===
      0
    ) {
      return;
    }

    try {
      setImporting(
        true,
      );

      setError(
        null,
      );

      setMessage(
        null,
      );

      const result =
        await importPromotionRows(
          rows,
        );

      const errorText =
        result.errors.length >
        0
          ? ` ${result.errors.length} fila(s) quedaron con error. Revisa la consola.`
          : "";

      setMessage(
        `${result.imported} promoción(es) importadas.${errorText}`,
      );

      if (
        result.errors.length >
        0
      ) {
        console.table(
          result.errors,
        );
      }

      if (
        result.imported >
        0
      ) {
        setPreviewRows(
          [],
        );

        setImageCandidates(
          [],
        );

        setFileName(
          null,
        );

        await loadPromotions();
      }
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudieron importar las promociones.",
      );
    } finally {
      setImporting(
        false,
      );
    }
  }

  async function handleImportImageCandidates() {
  /*
   * ==========================================
   * VALIDAR TIENDA
   * ==========================================
   */

  const storeName =
    imageStoreName.trim();

  if (!storeName) {
    setError(
      "Escribe el nombre de la tienda antes de publicar las ofertas detectadas.",
    );

    return;
  }

  /*
   * ==========================================
   * VALIDAR OFERTAS DETECTADAS
   * ==========================================
   */

  if (
    imageCandidates.length ===
    0
  ) {
    setError(
      "No hay ofertas detectadas para publicar.",
    );

    return;
  }

  /*
   * ==========================================
   * LIMPIAR DATOS GENERALES
   * ==========================================
   */

  const branchName =
    imageBranchName.trim() ||
    null;

  const startDate =
    imageStartDate ||
    null;

  const endDate =
    imageEndDate ||
    null;

  /*
   * ==========================================
   * CONVERTIR OCR → PromotionCsvRow
   * ==========================================
   */

  const rows:
    PromotionCsvRow[] =
    imageCandidates
      .filter(
        (
          candidate,
        ) => {
          const hasName =
            candidate.productName
              .trim()
              .length >
            0;

          const hasPrice =
            Number.isFinite(
              Number(
                candidate.promotionalPrice,
              ),
            ) &&
            Number(
              candidate.promotionalPrice,
            ) >
              0;

          return (
            hasName &&
            hasPrice
          );
        },
      )
      .map(
        (
          candidate,
        ) => ({
          /*
           * TIENDA
           */

          storeName,

          branchName,

          /*
           * PRODUCTO
           */

          productName:
            candidate.productName.trim(),

          brand:
            null,

          /*
           * PRECIOS
           */

          regularPrice:
            candidate.regularPrice !==
              null &&
            Number.isFinite(
              Number(
                candidate.regularPrice,
              ),
            )
              ? Number(
                  candidate.regularPrice,
                )
              : null,

          promotionalPrice:
            Number(
              candidate.promotionalPrice,
            ),

          /*
           * VIGENCIA
           */

          startDate,

          endDate,

          /*
           * IMAGEN
           *
           * NO usamos imagePreviewUrl porque
           * es una URL blob temporal del navegador.
           */

          imageUrl:
            candidate.imageUrl ??
            null,

          /*
           * PROMOCIÓN
           */

          promoType:
            candidate.promoType ||
            "price",

          promoText:
            null,

          /*
           * NUEVO CAMPO OBLIGATORIO
           */

          promoUnit:
            null,

          /*
           * CONFIGURACIÓN
           */

          isSponsored:
            false,

          priority:
            0,

          externalReference:
            null,
        }),
      );

  /*
   * ==========================================
   * VALIDAR DESPUÉS DE LIMPIAR
   * ==========================================
   */

  if (
    rows.length ===
    0
  ) {
    setError(
      "Las ofertas detectadas no tienen nombres o precios válidos.",
    );

    return;
  }

  /*
   * ==========================================
   * IMPORTAR
   * ==========================================
   */

  await handleImportRows(
    rows,
  );
}

  function togglePromotionSelection(
    promotionId:
      string,
  ) {
    setSelectedPromotionIds(
      (
        current,
      ) =>
        current.includes(
          promotionId,
        )
          ? current.filter(
              (
                id,
              ) =>
                id !==
                promotionId,
            )
          : [
              ...current,
              promotionId,
            ],
    );
  }

  function selectAllPromotions() {
    setSelectedPromotionIds(
      promotions.map(
        (
          promotion,
        ) =>
          promotion.id,
      ),
    );
  }

  function clearPromotionSelection() {
    setSelectedPromotionIds(
      [],
    );
  }

  async function handleDeleteSelectedPromotions() {
    if (
      selectedPromotionIds.length ===
      0
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `¿Eliminar ${selectedPromotionIds.length} promoción(es)? Esta acción no se puede deshacer.`,
      );

    if (
      !confirmed
    ) {
      return;
    }

    try {
      setDeletingPromotions(
        true,
      );

      setError(
        null,
      );

      setMessage(
        null,
      );

      const result =
        await deletePromotions(
          selectedPromotionIds,
        );

      setMessage(
        `${result.deleted} promoción(es) eliminadas.`,
      );

      setSelectedPromotionIds(
        [],
      );

      await loadPromotions();
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudieron eliminar las promociones.",
      );
    } finally {
      setDeletingPromotions(
        false,
      );
    }
  }

  async function handleDeleteOnePromotion(
    promotion:
      PromotionListItem,
  ) {
    const confirmed =
      window.confirm(
        `¿Eliminar "${promotion.title}"? Esta acción no se puede deshacer.`,
      );

    if (
      !confirmed
    ) {
      return;
    }

    try {
      setDeletingPromotions(
        true,
      );

      setError(
        null,
      );

      setMessage(
        null,
      );

      const result =
        await deletePromotions(
          [
            promotion.id,
          ],
        );

      setMessage(
        `${result.deleted} promoción eliminada.`,
      );

      setSelectedPromotionIds(
        (
          current,
        ) =>
          current.filter(
            (
              id,
            ) =>
              id !==
              promotion.id,
          ),
      );

      await loadPromotions();
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo eliminar la promoción.",
      );
    } finally {
      setDeletingPromotions(
        false,
      );
    }
  }

  async function toggleStatus(
    promotion:
      PromotionListItem,
  ) {
    const nextStatus =
      promotion.status ===
      "approved"
        ? "paused"
        : "approved";

    try {
      await setPromotionStatus(
        promotion.id,
        nextStatus,
      );

      await loadPromotions();
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo actualizar la promoción.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/admin"
              className="text-sm font-black text-green-700"
            >
              ← Volver al Admin
            </Link>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-green-600">
              Listik Admin
            </p>

            <h1 className="mt-2 text-4xl font-black text-slate-950">
              Promociones
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Importa ofertas desde CSV o desde una imagen de folleto. Listik siempre te mostrará una revisión antes de publicar.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadPromotions()
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-700"
          >
            <RefreshCw
              size={17}
            />

            Actualizar
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 font-bold text-green-800">
            {message}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-600">
                Importador
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Cargar ofertas de supermercado
              </h2>
            </div>

            <div className="flex rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  resetPreview();
                  setMode(
                    "csv",
                  );
                }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                  mode ===
                  "csv"
                    ? "bg-white text-green-700 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                <FileSpreadsheet
                  size={17}
                />

                CSV
              </button>

              <button
                type="button"
                onClick={() => {
                  resetPreview();
                  setMode(
                    "image",
                  );
                }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                  mode ===
                  "image"
                    ? "bg-white text-green-700 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                <FileImage
                  size={17}
                />

                Folleto / imagen
              </button>
            </div>
          </div>

          {mode ===
            "csv" ? (
            <div className="mt-6">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center">
                <Upload
                  size={30}
                  className="text-green-600"
                />

                <p className="mt-3 font-black text-slate-800">
                  Seleccionar archivo CSV
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Puede incluir precio normal, precio promocional, imagen, vigencia y tipo de promoción.
                </p>

                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(
                    event,
                  ) => {
                    const file =
                      event.target
                        .files?.[0];

                    if (
                      file
                    ) {
                      void handleCsvFile(
                        file,
                      );
                    }
                  }}
                />
              </label>

              {fileName && (
                <p className="mt-3 text-sm font-bold text-slate-600">
                  Archivo:{" "}
                  {fileName}
                </p>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase text-slate-400">
                    Filas detectadas
                  </p>

                  <p className="mt-1 text-2xl font-black text-slate-950">
                    {previewTotal}
                  </p>
                </div>

                <div className="rounded-2xl bg-green-50 p-4">
                  <p className="text-xs font-black uppercase text-green-600">
                    Patrocinadas
                  </p>

                  <p className="mt-1 text-2xl font-black text-green-800">
                    {sponsoredCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-xs font-black uppercase text-amber-600">
                    Para importar
                  </p>

                  <p className="mt-1 text-2xl font-black text-amber-800">
                    {previewTotal}
                  </p>
                </div>
              </div>

              {previewRows.length >
                0 && (
                <>
                  <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">
                            Tienda
                          </th>

                          <th className="px-4 py-3">
                            Producto
                          </th>

                          <th className="px-4 py-3">
                            Normal
                          </th>

                          <th className="px-4 py-3">
                            Oferta
                          </th>

                          <th className="px-4 py-3">
                            Tipo
                          </th>

                          <th className="px-4 py-3">
                            Imagen
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {previewRows
                          .slice(
                            0,
                            25,
                          )
                          .map(
                            (
                              row,
                              index,
                            ) => (
                              <tr
                                key={
                                  `${row.storeName}-${row.productName}-${index}`
                                }
                                className="border-t border-slate-100"
                              >
                                <td className="px-4 py-3 font-bold">
                                  {row.storeName}
                                </td>

                                <td className="px-4 py-3">
                                  {row.productName}
                                </td>

                                <td className="px-4 py-3">
                                  {row.regularPrice ??
                                    "—"}
                                </td>

                                <td className="px-4 py-3 font-black text-green-700">
                                  {row.promotionalPrice}
                                </td>

                                <td className="px-4 py-3">
                                  {row.promoType ??
                                    "price"}
                                </td>

                                <td className="px-4 py-3">
                                  {row.imageUrl
                                    ? "✓"
                                    : "—"}
                                </td>
                              </tr>
                            ),
                          )}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    disabled={
                      importing
                    }
                    onClick={() =>
                      void handleImportRows(
                        previewRows,
                      )
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-black text-white transition hover:bg-green-700 disabled:opacity-50"
                  >
                    <Upload
                      size={18}
                    />

                    {importing
                      ? "Importando..."
                      : `Importar ${previewRows.length} promociones`}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="mt-6">
              <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <label className="flex min-h-[260px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                    {imagePreviewUrl ? (
                      <img
                        src={
                          imagePreviewUrl
                        }
                        alt="Vista previa del folleto"
                        className="max-h-[420px] w-full object-contain"
                      />
                    ) : (
                      <>
                        <ImageIcon
                          size={38}
                          className="text-green-600"
                        />

                        <p className="mt-3 font-black text-slate-800">
                          Seleccionar folleto o imagen
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          JPG, PNG o WEBP · máximo 10 MB
                        </p>
                      </>
                    )}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(
                        event,
                      ) => {
                        const file =
                          event.target
                            .files?.[0];

                        if (
                          file
                        ) {
                          void handleImageFile(
                            file,
                          );
                        }
                      }}
                    />
                  </label>

                  {fileName && (
                    <p className="mt-3 text-sm font-bold text-slate-600">
                      Archivo:{" "}
                      {fileName}
                    </p>
                  )}
                </div>

                <div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-black uppercase text-slate-500">
                        Tienda *
                      </label>

                      <input
                        value={
                          imageStoreName
                        }
                        onChange={(
                          event,
                        ) =>
                          setImageStoreName(
                            event.target.value,
                          )
                        }
                        placeholder="Ej. Bodega Aurrera"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase text-slate-500">
                        Sucursal
                      </label>

                      <input
                        value={
                          imageBranchName
                        }
                        onChange={(
                          event,
                        ) =>
                          setImageBranchName(
                            event.target.value,
                          )
                        }
                        placeholder="Opcional"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase text-slate-500">
                        Inicio
                      </label>

                      <input
                        type="date"
                        value={
                          imageStartDate
                        }
                        onChange={(
                          event,
                        ) =>
                          setImageStartDate(
                            event.target.value,
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase text-slate-500">
                        Fin / vigencia
                      </label>

                      <input
                        type="date"
                        value={
                          imageEndDate
                        }
                        onChange={(
                          event,
                        ) =>
                          setImageEndDate(
                            event.target.value,
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Detector Listik
                    </p>

                    {analyzingImage ? (
                      <div className="mt-4 flex items-center gap-3">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-green-600" />

                        <p className="font-bold text-slate-600">
                          Leyendo folleto...
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        {imageCandidates.length >
                        0
                          ? `${imageCandidates.length} posible(s) oferta(s) detectada(s). Revísalas antes de publicar.`
                          : "Sube una imagen para detectar productos y precios."}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {imageCandidates.length >
                0 && (
                <div className="mt-7">
                  <div className="mb-4">
                    <p className="text-xs font-black uppercase tracking-widest text-green-600">
                      Revisión obligatoria
                    </p>

                    <h3 className="mt-1 text-2xl font-black text-slate-950">
                      Ofertas detectadas
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Corrige nombres y precios antes de publicarlos.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {imageCandidates.map(
                      (
                        candidate,
                        index,
                      ) => (
                        <div
                          key={
                            `${candidate.productName}-${index}`
                          }
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div className="grid gap-3 xl:grid-cols-[1.45fr_0.62fr_0.62fr_0.62fr_0.9fr_auto] xl:items-end">
                            <div>
                              <label className="text-[10px] font-black uppercase text-slate-400">
                                Producto
                              </label>

                              <input
                                value={
                                  candidate.productName
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateImageCandidate(
                                    index,
                                    {
                                      productName:
                                        event.target.value,
                                    },
                                  )
                                }
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-bold"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase text-slate-400">
                                Normal
                              </label>

                              <input
                                type="number"
                                step="0.01"
                                value={
                                  candidate.regularPrice ??
                                  ""
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateImageCandidate(
                                    index,
                                    {
                                      regularPrice:
                                        event.target.value
                                          ? Number(
                                              event.target.value,
                                            )
                                          : null,
                                    },
                                  )
                                }
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase text-green-600">
                                Oferta
                              </label>

                              <input
                                type="number"
                                step="0.01"
                                value={
                                  candidate.promotionalPrice
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateImageCandidate(
                                    index,
                                    {
                                      promotionalPrice:
                                        Number(
                                          event.target.value,
                                        ),
                                    },
                                  )
                                }
                                className="mt-1 w-full rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 font-black text-green-800"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase text-slate-400">
                                Tipo
                              </label>

                              <select
                                value={
                                  candidate.promoType
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateImageCandidate(
                                    index,
                                    {
                                      promoType:
                                        event.target.value,
                                    },
                                  )
                                }
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                              >
                                <option value="price">
                                  Precio
                                </option>

                                <option value="percentage">
                                  Porcentaje
                                </option>

                                <option value="2x1">
                                  2x1
                                </option>

                                <option value="3x2">
                                  3x2
                                </option>

                                <option value="coupon">
                                  Cupón
                                </option>

                                <option value="msi">
                                  MSI
                                </option>

                                <option value="points">
                                  Puntos
                                </option>

                                <option value="other">
                                  Otro
                                </option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase text-slate-400">
                                Imagen
                              </label>

                              <div className="mt-1">
                                {candidate.imageUrl ? (
                                  <div className="flex items-center gap-2">
                                    <div className="h-11 w-11 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                      <img
                                        src={
                                          candidate.imageUrl
                                        }
                                        alt={
                                          candidate.productName
                                        }
                                        className="h-full w-full object-contain p-1"
                                      />
                                    </div>

                                    <label className="cursor-pointer rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-black text-green-700 transition hover:bg-green-100">
                                      Cambiar

                                      <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        disabled={
                                          uploadingCandidateIndex ===
                                          index
                                        }
                                        onChange={(
                                          event,
                                        ) => {
                                          const file =
                                            event.target.files?.[0];

                                          if (
                                            file
                                          ) {
                                            void handleCandidateImageUpload(
                                              index,
                                              file,
                                            );
                                          }

                                          event.currentTarget.value =
                                            "";
                                        }}
                                      />
                                    </label>
                                  </div>
                                ) : (
                                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-600 transition hover:border-green-300 hover:bg-green-50 hover:text-green-700">
                                    <ImageIcon
                                      size={15}
                                    />

                                    {uploadingCandidateIndex ===
                                    index
                                      ? "Subiendo..."
                                      : "Agregar imagen"}

                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      className="hidden"
                                      disabled={
                                        uploadingCandidateIndex ===
                                        index
                                      }
                                      onChange={(
                                        event,
                                      ) => {
                                        const file =
                                          event.target.files?.[0];

                                        if (
                                          file
                                        ) {
                                          void handleCandidateImageUpload(
                                            index,
                                            file,
                                          );
                                        }

                                        event.currentTarget.value =
                                          "";
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeImageCandidate(
                                  index,
                                )
                              }
                              className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600"
                              title="Quitar oferta"
                            >
                              <X
                                size={17}
                              />
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-slate-400">
                              Confianza OCR:{" "}
                              {candidate.confidence}%
                            </span>

                            {candidate.imageUrl ? (
                              <span className="rounded-full bg-green-50 px-2 py-1 font-black text-green-700">
                                ✓ Imagen automática lista
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-2 py-1 font-black text-amber-700">
                                Imagen automática no disponible
                              </span>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={
                      importing
                    }
                    onClick={() =>
                      void handleImportImageCandidates()
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-black text-white transition hover:bg-green-700 disabled:opacity-50"
                  >
                    <Upload
                      size={18}
                    />

                    {importing
                      ? "Publicando..."
                      : `Publicar ${imageCandidates.length} promociones`}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Tag
                size={18}
                className="text-green-600"
              />

              <h2 className="text-2xl font-black text-slate-950">
                Promociones cargadas
              </h2>
            </div>

            {!loading &&
              promotions.length >
                0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={
                    selectAllPromotions
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Seleccionar todas
                </button>

                {selectedPromotionIds.length >
                  0 && (
                  <>
                    <button
                      type="button"
                      onClick={
                        clearPromotionSelection
                      }
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                    >
                      Limpiar selección
                    </button>

                    <button
                      type="button"
                      disabled={
                        deletingPromotions
                      }
                      onClick={() =>
                        void handleDeleteSelectedPromotions()
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2
                        size={16}
                      />

                      {deletingPromotions
                        ? "Eliminando..."
                        : `Eliminar seleccionadas (${selectedPromotionIds.length})`}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
              Cargando...
            </div>
          ) : (
            <div className="grid gap-4">
              {promotions.map(
                (
                  promotion,
                ) => (
                  <article
                    key={
                      promotion.id
                    }
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-center gap-4">
                        <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-50 transition hover:border-green-300 hover:bg-green-50">
                          <input
                            type="checkbox"
                            checked={
                              selectedPromotionIds.includes(
                                promotion.id,
                              )
                            }
                            onChange={() =>
                              togglePromotionSelection(
                                promotion.id,
                              )
                            }
                            className="h-5 w-5 cursor-pointer accent-green-600"
                            aria-label={`Seleccionar ${promotion.title}`}
                          />
                        </label>

                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
                          {promotion.image_url ? (
                            <img
                              src={
                                promotion.image_url
                              }
                              alt=""
                              className="h-full w-full object-contain p-2"
                            />
                          ) : (
                            <span className="text-3xl">
                              🛒
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">
                              {promotion.source ??
                                "manual"}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                                promotion.status ===
                                "approved"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {promotion.status}
                            </span>
                          </div>

                          <p className="mt-2 text-lg font-black text-slate-950">
                            {promotion.title}
                          </p>

                          <p className="mt-1 text-sm font-bold text-green-700">
                            {firstRelationName(
                              promotion.stores,
                            )}
                          </p>

                          {promotion.promo_text && (
                            <p className="mt-1 text-sm text-slate-500">
                              {
                                promotion.promo_text
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div>
                          <p className="text-xs font-black uppercase text-slate-400">
                            Precio normal
                          </p>

                          <p className="font-bold text-slate-500 line-through">
                            {money(
                              promotion.regular_price,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase text-green-600">
                            Oferta
                          </p>

                          <p className="text-2xl font-black text-green-700">
                            {money(
                              promotion.promotional_price,
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void toggleStatus(
                              promotion,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-black text-slate-700"
                        >
                          {promotion.status ===
                          "approved" ? (
                            <>
                              <Pause
                                size={16}
                              />

                              Pausar
                            </>
                          ) : (
                            <>
                              <Play
                                size={16}
                              />

                              Publicar
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteOnePromotion(
                              promotion,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 font-black text-red-600 transition hover:bg-red-100"
                          title="Eliminar promoción"
                        >
                          <Trash2
                            size={16}
                          />

                          Eliminar
                        </button>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}