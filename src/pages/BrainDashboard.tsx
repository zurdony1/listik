import {
  useEffect,
  useState,
} from "react";

import BrainProgress from "../components/brain/BrainProgress";
import BrainActivityChart from "../components/brain/BrainActivityChart";
import ProductStats from "../components/products/ProductStats";

import {
  getBrainStats,
  type BrainDashboardStats,
} from "../services/brainDashboardService";

import {
  getBrainActivity,
  type BrainActivityPoint,
} from "../services/brainAnalyticsService";

export default function BrainDashboard() {
  const [stats, setStats] =
    useState<BrainDashboardStats>({
      products: 0,
      presentations: 0,
      codes: 0,
      pendingLearning: 0,
    });

  const [activity, setActivity] =
    useState<BrainActivityPoint[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const [
        statsData,
        activityData,
      ] = await Promise.all([
        getBrainStats(),
        getBrainActivity(7),
      ]);

      setStats(statsData);
      setActivity(activityData);
    } catch (error) {
      console.error(
        "Error cargando Listik Brain:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  const knowledge =
    Math.min(
      100,
      Math.round(
        (stats.pendingLearning /
          Math.max(
            stats.products,
            1,
          )) *
          100,
      ),
    );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-lg">
          <p className="text-xl font-black text-slate-700">
            🧠 Cargando Listik Brain...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-10">
      <div className="mx-auto max-w-7xl">

        {/* ENCABEZADO */}

        <div className="mb-10">
          <p className="text-sm font-black uppercase tracking-widest text-green-600">
            Inteligencia Artificial
          </p>

          <h1 className="mt-2 text-5xl font-black text-slate-900">
            🧠 Listik Brain
          </h1>

          <p className="mt-3 max-w-3xl text-lg text-slate-500">
            Centro de inteligencia del catálogo.
            Cada ticket confirmado aumenta el
            conocimiento del sistema y mejora
            futuras coincidencias.
          </p>
        </div>

        {/* NIVEL DE CONOCIMIENTO */}

        <BrainProgress
          value={knowledge}
        />

        {/* ESTADÍSTICAS */}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <ProductStats
            title="Productos"
            value={stats.products}
            color="text-blue-600"
          />

          <ProductStats
            title="Presentaciones"
            value={stats.presentations}
            color="text-green-600"
          />

          <ProductStats
            title="Códigos"
            value={stats.codes}
            color="text-purple-600"
          />

          <ProductStats
            title="Memorias"
            value={
              stats.pendingLearning
            }
            color="text-red-600"
          />
        </div>

        {/* GRÁFICO */}

        <div className="mt-8">
          <BrainActivityChart
            data={activity}
          />
        </div>

        {/* ESTADO GENERAL */}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-green-600">
              Memoria
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-900">
              {stats.pendingLearning}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Experiencias guardadas por
              Listik Brain.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-blue-600">
              Catálogo
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-900">
              {stats.products}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Productos disponibles para
              reconocimiento.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-purple-600">
              Identificadores
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-900">
              {stats.codes}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Códigos internos registrados
              entre supermercados.
            </p>
          </div>
        </div>

        {/* PRÓXIMA ETAPA */}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-green-600">
            Listik Intelligence
          </p>

          <h2 className="mt-2 text-3xl font-black text-slate-900">
            Evolución del Brain
          </h2>

          <p className="mt-3 max-w-3xl text-slate-500">
            El gráfico superior muestra
            cuántas memorias nuevas recibe
            Listik cada día. Conforme los
            usuarios confirmen productos,
            veremos crecer la actividad del
            Brain.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-6">
              <p className="text-sm font-black text-slate-900">
                🕒 Últimos aprendizajes
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Próximo módulo: mostrar las
                últimas coincidencias
                confirmadas.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-6">
              <p className="text-sm font-black text-slate-900">
                🏆 Productos más aprendidos
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Veremos qué productos
                aparecen con mayor frecuencia.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-6">
              <p className="text-sm font-black text-slate-900">
                🏪 Supermercados
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Mediremos qué cadenas aportan
                más información al Brain.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}