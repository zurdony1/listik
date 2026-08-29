import {
  useEffect,
  useState,
} from "react";

import {
  Bot,
  Megaphone,
  Package,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import Sidebar from "../components/admin/Sidebar";

import StatsCards from "../components/admin/dashboard/StatsCards";

import {
  getDashboardStats,
} from "../services/admin/dashboardService";

interface DashboardStats {
  totalProducts:
    number;

  totalStores:
    number;

  totalPrices:
    number;
}

const adminModules =
  [
    {
      title:
        "Productos",

      description:
        "Consulta y administra el catálogo de productos de Listik.",

      path:
        "/admin/productos",

      icon:
        Package,

      badge:
        "Catálogo",
    },

    {
      title:
        "Tickets IA",

      description:
        "Revisa tickets procesados y datos detectados por el lector.",

      path:
        "/admin/tickets",

      icon:
        ReceiptText,

      badge:
        "IA",
    },

    {
      title:
        "Promociones",

      description:
        "Carga promociones por CSV o detecta ofertas desde imágenes.",

      path:
        "/admin/promociones",

      icon:
        Megaphone,

      badge:
        "Ofertas",
    },

    {
      title:
        "PROFECO",

      description:
        "Importa y revisa información de precios proveniente de PROFECO.",

      path:
        "/admin/profeco",

      icon:
        Bot,

      badge:
        "Importador",
    },
  ];

export default function Admin() {
  const [
    stats,
    setStats,
  ] =
    useState<DashboardStats>({
      totalProducts:
        0,

      totalStores:
        0,

      totalPrices:
        0,
    });

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    error,
    setError,
  ] =
    useState(
      "",
    );

  useEffect(
    () => {
      let cancelled =
        false;

      async function loadStats() {
        try {
          setLoading(
            true,
          );

          setError(
            "",
          );

          const data =
            await getDashboardStats();

          if (
            cancelled
          ) {
            return;
          }

          setStats(
            data,
          );
        } catch (
          err
        ) {
          console.error(
            "Error al cargar dashboard:",
            err,
          );

          if (
            cancelled
          ) {
            return;
          }

          setError(
            "No se pudieron cargar las estadísticas.",
          );
        } finally {
          if (
            !cancelled
          ) {
            setLoading(
              false,
            );
          }
        }
      }

      void loadStats();

      return () => {
        cancelled =
          true;
      };
    },
    [],
  );

  return (
    <main className="flex min-h-screen bg-slate-100">

      {/* ======================================
          SIDEBAR
      ====================================== */}

      <Sidebar />

      {/* ======================================
          CONTENIDO
      ====================================== */}

      <section className="flex-1 p-6 sm:p-8 lg:p-10">
        <div className="mx-auto max-w-7xl">

          {/* ==================================
              ENCABEZADO
          ================================== */}

          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-green-600">
                Panel administrativo
              </p>

              <h1 className="mt-2 text-4xl font-black text-slate-900">
                Listik Admin
              </h1>

              <p className="mt-2 max-w-2xl text-slate-500">
                Controla el catálogo, precios, tickets, importaciones y promociones de Listik.
              </p>
            </div>

            <Link
              to="/app"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700"
            >
              <ShoppingCart
                size={18}
              />

              Ir a Listik
            </Link>
          </div>

          {/* ==================================
              ESTADÍSTICAS
          ================================== */}

          {loading ? (
            <div className="grid gap-6 md:grid-cols-3">
              {[
                1,
                2,
                3,
              ].map(
                (
                  item,
                ) => (
                  <div
                    key={
                      item
                    }
                    className="h-40 animate-pulse rounded-3xl bg-white"
                  />
                ),
              )}
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
              <p className="font-bold text-red-700">
                {error}
              </p>
            </div>
          ) : (
            <StatsCards
              products={
                stats.totalProducts
              }
              stores={
                stats.totalStores
              }
              prices={
                stats.totalPrices
              }
            />
          )}

          {/* ==================================
              MÓDULOS ADMIN
          ================================== */}

          <section className="mt-10">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
                Herramientas
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-900">
                Centro de control
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Accede directamente a los módulos administrativos que ya están disponibles.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {adminModules.map(
                (
                  module,
                ) => {
                  const Icon =
                    module.icon;

                  return (
                    <Link
                      key={
                        module.title
                      }
                      to={
                        module.path
                      }
                      className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-green-300 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                          <Icon
                            size={23}
                          />
                        </div>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                          {module.badge}
                        </span>
                      </div>

                      <h3 className="mt-5 text-xl font-black text-slate-900 transition group-hover:text-green-700">
                        {module.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {module.description}
                      </p>

                      <p className="mt-5 text-sm font-black text-green-700">
                        Abrir módulo →
                      </p>
                    </Link>
                  );
                },
              )}
            </div>
          </section>

          {/* ==================================
              ESTADO GENERAL
          ================================== */}

          <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
                  Estado de Listik
                </p>

                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  Base de datos activa
                </h2>

                <p className="mt-2 max-w-2xl text-slate-500">
                  Actualmente Listik tiene información de productos, supermercados y precios disponible para comparación.
                </p>
              </div>

              <div className="grid min-w-[280px] grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xl font-black text-slate-900">
                    {stats.totalProducts.toLocaleString(
                      "es-MX",
                    )}
                  </p>

                  <p className="mt-1 text-[10px] font-black uppercase text-slate-400">
                    Productos
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xl font-black text-slate-900">
                    {stats.totalStores.toLocaleString(
                      "es-MX",
                    )}
                  </p>

                  <p className="mt-1 text-[10px] font-black uppercase text-slate-400">
                    Tiendas
                  </p>
                </div>

                <div className="rounded-2xl bg-green-50 p-4">
                  <p className="text-xl font-black text-green-700">
                    {stats.totalPrices.toLocaleString(
                      "es-MX",
                    )}
                  </p>

                  <p className="mt-1 text-[10px] font-black uppercase text-green-600">
                    Precios
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}