import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react";

import toast from "react-hot-toast";

import Sidebar from "../components/admin/Sidebar";

import {
  getProfecoImports,
  importProfecoCsv,
  previewProfecoCsv,
  type ProfecoImportHistory,
  type ProfecoImportResult,
  type ProfecoPreviewResult,
} from "../services/api/profecoImportApi";

export default function AdminProfeco() {
  const [
    file,
    setFile,
  ] =
    useState<
      File | null
    >(null);

  const [
    preview,
    setPreview,
  ] =
    useState<
      ProfecoPreviewResult | null
    >(null);

  const [
    result,
    setResult,
  ] =
    useState<
      ProfecoImportResult | null
    >(null);

  const [
    history,
    setHistory,
  ] =
    useState<
      ProfecoImportHistory[]
    >([]);

  const [
    analyzing,
    setAnalyzing,
  ] =
    useState(false);

  const [
    importing,
    setImporting,
  ] =
    useState(false);

  const [
    historyLoading,
    setHistoryLoading,
  ] =
    useState(true);

  useEffect(() => {
    void loadHistory();
  }, []);

  async function loadHistory() {
    try {
      setHistoryLoading(true);

      const response =
        await getProfecoImports();

      setHistory(
        response.data,
      );
    } catch (error) {
      console.error(
        "Error cargando historial PROFECO:",
        error,
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const selected =
      event.target
        .files?.[0] ??
      null;

    setFile(selected);
    setPreview(null);
    setResult(null);
  }

  async function handlePreview() {
    if (!file) {
      toast.error(
        "Selecciona un CSV.",
      );
      return;
    }

    try {
      setAnalyzing(true);
      setPreview(null);
      setResult(null);

      const response =
        await previewProfecoCsv(
          file,
        );

      setPreview(
        response.data,
      );

      if (
        response.data.duplicate
      ) {
        toast(
          "Este archivo ya fue importado.",
        );
      } else {
        toast.success(
          "CSV analizado correctamente.",
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo analizar el CSV.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleImport() {
    if (
      !file ||
      !preview
    ) {
      return;
    }

    if (preview.duplicate) {
      toast.error(
        "Este archivo ya está importado.",
      );
      return;
    }

    try {
      setImporting(true);

      const response =
        await importProfecoCsv(
          file,
        );

      setResult(
        response.data,
      );

      toast.success(
        `${response.data.insertedPrices} precios nuevos importados.`,
      );

      await loadHistory();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo importar.",
      );
    } finally {
      setImporting(false);
    }
  }

  function number(
    value: number,
  ) {
    return value.toLocaleString(
      "es-MX",
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="min-w-0 flex-1 p-6 lg:p-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-green-600">
            Administración
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Importar datos PROFECO
          </h1>

          <p className="mt-2 max-w-3xl text-slate-500">
            Analiza primero el CSV de Quién es Quién en los Precios. Listik no modificará la base hasta que confirmes la importación.
          </p>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <label className="text-sm font-black text-slate-900">
                  Archivo CSV
                </label>

                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={
                    handleFileChange
                  }
                  className="mt-3 block w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"
                />

                {file && (
                  <p className="mt-3 text-sm font-bold text-slate-600">
                    📄 {file.name} ·{" "}
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={
                  !file ||
                  analyzing ||
                  importing
                }
                onClick={() => {
                  void handlePreview();
                }}
                className="rounded-2xl bg-slate-950 px-6 py-4 font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {analyzing
                  ? "Analizando..."
                  : "Analizar CSV"}
              </button>
            </div>
          </section>

          {preview && (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-green-600">
                    Vista previa
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {preview.fileName}
                  </h2>
                </div>

                {preview.duplicate ? (
                  <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-800">
                    Archivo ya importado
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={
                      importing ||
                      preview.validRows === 0
                    }
                    onClick={() => {
                      void handleImport();
                    }}
                    className="rounded-2xl bg-green-600 px-6 py-3 font-black text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {importing
                      ? "Importando..."
                      : `Importar ${number(preview.validRows)} filas`}
                  </button>
                )}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Filas"
                  value={
                    number(
                      preview.totalRows,
                    )
                  }
                />

                <Metric
                  label="Válidas"
                  value={
                    number(
                      preview.validRows,
                    )
                  }
                  tone="green"
                />

                <Metric
                  label="Errores"
                  value={
                    number(
                      preview.invalidRows,
                    )
                  }
                  tone={
                    preview.invalidRows > 0
                      ? "amber"
                      : "default"
                  }
                />
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">
                        Fila
                      </th>
                      <th className="px-4 py-3">
                        Producto
                      </th>
                      <th className="px-4 py-3">
                        Presentación
                      </th>
                      <th className="px-4 py-3">
                        Marca
                      </th>
                      <th className="px-4 py-3">
                        Precio
                      </th>
                      <th className="px-4 py-3">
                        Cadena
                      </th>
                      <th className="px-4 py-3">
                        Zona
                      </th>
                      <th className="px-4 py-3">
                        Estado
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {preview.preview.map(
                      (row) => (
                        <tr
                          key={
                            row.rowNumber
                          }
                        >
                          <td className="px-4 py-3 text-slate-500">
                            {
                              row.rowNumber
                            }
                          </td>

                          <td className="px-4 py-3 font-black text-slate-900">
                            {
                              row.producto
                            }
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {
                              row.presentacion ||
                              "—"
                            }
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {
                              row.marca ||
                              "—"
                            }
                          </td>

                          <td className="px-4 py-3 font-black text-green-700">
                            $
                            {
                              row.precio
                            }
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {
                              row.cadena
                            }
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {
                              row.municipio
                            }
                            {row.estado
                              ? `, ${row.estado}`
                              : ""}
                          </td>

                          <td className="px-4 py-3">
                            {row.valid ? (
                              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-black text-green-700">
                                Válida
                              </span>
                            ) : (
                              <span
                                title={
                                  row.errors.join(
                                    ", ",
                                  )
                                }
                                className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-700"
                              >
                                Error
                              </span>
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Se muestran las primeras 25 filas. Al confirmar se procesa el archivo completo.
              </p>
            </section>
          )}

          {result && (
            <section className="mt-6 rounded-3xl border border-green-200 bg-green-50 p-6">
              <p className="text-xs font-black uppercase tracking-widest text-green-600">
                Importación terminada
              </p>

              <h2 className="mt-2 text-2xl font-black text-green-950">
                ✅ Listik actualizado
              </h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                  label="Precios nuevos"
                  value={
                    number(
                      result.insertedPrices,
                    )
                  }
                  tone="green"
                />

                <Metric
                  label="Precios repetidos"
                  value={
                    number(
                      result.skippedPrices,
                    )
                  }
                />

                <Metric
                  label="Productos nuevos"
                  value={
                    number(
                      result.createdProducts,
                    )
                  }
                />

                <Metric
                  label="Presentaciones nuevas"
                  value={
                    number(
                      result.createdPresentations,
                    )
                  }
                />

                <Metric
                  label="Tiendas nuevas"
                  value={
                    number(
                      result.createdStores,
                    )
                  }
                />

                <Metric
                  label="Sucursales nuevas"
                  value={
                    number(
                      result.createdBranches,
                    )
                  }
                />

                <Metric
                  label="Filas válidas"
                  value={
                    number(
                      result.validRows,
                    )
                  }
                />

                <Metric
                  label="Filas con error"
                  value={
                    number(
                      result.invalidRows,
                    )
                  }
                  tone={
                    result.invalidRows > 0
                      ? "amber"
                      : "default"
                  }
                />
              </div>
            </section>
          )}

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Historial
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950">
              Importaciones recientes
            </h2>

            {historyLoading ? (
              <p className="mt-5 text-sm font-bold text-slate-500">
                Cargando...
              </p>
            ) : history.length === 0 ? (
              <p className="mt-5 text-sm text-slate-500">
                Aún no hay importaciones.
              </p>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs font-black uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="pb-3 pr-5">
                        Archivo
                      </th>
                      <th className="pb-3 pr-5">
                        Estado
                      </th>
                      <th className="pb-3 pr-5">
                        Filas
                      </th>
                      <th className="pb-3 pr-5">
                        Precios
                      </th>
                      <th className="pb-3">
                        Fecha
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {history.map(
                      (item) => (
                        <tr
                          key={
                            item.id
                          }
                        >
                          <td className="py-4 pr-5 font-black text-slate-900">
                            {
                              item.file_name
                            }
                          </td>

                          <td className="py-4 pr-5">
                            {
                              item.status
                            }
                          </td>

                          <td className="py-4 pr-5 text-slate-600">
                            {
                              number(
                                item.total_rows,
                              )
                            }
                          </td>

                          <td className="py-4 pr-5 font-black text-green-700">
                            {
                              number(
                                item.inserted_prices,
                              )
                            }
                          </td>

                          <td className="py-4 text-slate-500">
                            {
                              new Date(
                                item.completed_at ??
                                  item.created_at,
                              ).toLocaleString(
                                "es-MX",
                              )
                            }
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
  tone?:
    | "default"
    | "green"
    | "amber";
}

function Metric({
  label,
  value,
  tone = "default",
}: MetricProps) {
  const classes =
    tone === "green"
      ? "bg-green-100 text-green-800"
      : tone === "amber"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-950";

  return (
    <div
      className={`rounded-2xl p-4 ${classes}`}
    >
      <p className="text-2xl font-black">
        {value}
      </p>

      <p className="mt-1 text-xs font-black uppercase tracking-wide opacity-70">
        {label}
      </p>
    </div>
  );
}
