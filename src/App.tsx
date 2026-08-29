import {
  useEffect,
  useState,
} from "react";

import {
  Toaster,
} from "react-hot-toast";

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useSearchParams,
} from "react-router-dom";

import Header from "./components/Header";
import ProductList from "./components/ProductList";
import ShoppingListPage from "./pages/ShoppingListPage";
import ShoppingTripPage from "./pages/ShoppingTripPage";
import PurchaseHistory from "./pages/PurchaseHistory";
import MonthlyReport from "./pages/MonthlyReport";
import AdminRoute from "./components/AdminRoute";

import {
  useAuth,
} from "./contexts/AuthContext";

import {
  supabase,
} from "./lib/supabase";

import Admin from "./pages/Admin";
import AdminProducts from "./pages/AdminProducts";
import AdminTickets from "./pages/AdminTickets";
import BrainDashboard from "./pages/BrainDashboard";
import AdminLearning from "./pages/AdminLearning";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Welcome from "./pages/Welcome";
import CreateList from "./pages/CreateList";
import ReviewList from "./pages/ReviewList";
import ShoppingTripSummaryPage from "./pages/ShoppingTripSummaryPage";
import TicketScannerPage from "./pages/TicketScannerPage";
import AdminProfeco from "./pages/AdminProfeco";
import BasicBasket from "./pages/BasicBasket";
import SmartPurchase from "./pages/SmartPurchase";
import Landing from "./pages/Landing";
import StorePromotions from "./components/StorePromotions";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPromotions from "./pages/AdminPromotions";


/*
 * ==========================================
 * ESTADÍSTICAS LOCALES
 * ==========================================
 */

interface LocationStats {
  productsCount: number;
  branchesCount: number;
  pricesCount: number;
}

/*
 * ==========================================
 * HOME
 * ==========================================
 */

function Home() {
  const [
    searchParams,
  ] =
    useSearchParams();

  const {
    profile,

    loading:
      authLoading,

    profileLoading,
  } =
    useAuth();

  const [
    stats,
    setStats,
  ] =
    useState<LocationStats>({
      productsCount:
        0,

      branchesCount:
        0,

      pricesCount:
        0,
    });

  const [
    statsLoading,
    setStatsLoading,
  ] =
    useState(
      true,
    );

  /*
   * ========================================
   * UBICACIÓN
   * ========================================
   */

  const state =
    profile?.state
      ?.trim() ??
    "";

  const municipality =
    profile
      ?.municipality
      ?.trim() ??
    "";

  /*
   * ========================================
   * MODO CREAR LISTA
   * ========================================
   *
   * Si venimos desde:
   *
   * /?modo=lista
   *
   * buscamos el input de productos,
   * hacemos scroll y colocamos el cursor.
   */

  useEffect(
    () => {
      const mode =
        searchParams.get(
          "modo",
        );

      if (
        mode !==
        "lista"
      ) {
        return;
      }

      let attempts =
        0;

      const maxAttempts =
        25;

      const interval =
        window.setInterval(
          () => {
            attempts++;

            const searchInput =
              document.getElementById(
                "product-search",
              ) as
                | HTMLInputElement
                | null;

            /*
             * ProductList puede tardar
             * un poquito cargando productos.
             *
             * Por eso esperamos hasta que
             * el buscador exista.
             */
            if (
              searchInput
            ) {
              window.clearInterval(
                interval,
              );

              searchInput.scrollIntoView({
                behavior:
                  "smooth",

                block:
                  "center",
              });

              /*
               * Esperamos a que termine
               * un poco el scroll.
               */
              window.setTimeout(
                () => {
                  searchInput.focus();
                },
                500,
              );

              return;
            }

            /*
             * Dejamos de buscar después
             * de varios intentos.
             */
            if (
              attempts >=
              maxAttempts
            ) {
              window.clearInterval(
                interval,
              );
            }
          },
          200,
        );

      return () => {
        window.clearInterval(
          interval,
        );
      };
    },
    [
      searchParams,
    ],
  );

  /*
   * ========================================
   * CARGAR ESTADÍSTICAS
   * ========================================
   */

  useEffect(
    () => {
      if (
        authLoading ||
        profileLoading
      ) {
        return;
      }

      if (
        !state ||
        !municipality
      ) {
        setStats({
          productsCount:
            0,

          branchesCount:
            0,

          pricesCount:
            0,
        });

        setStatsLoading(
          false,
        );

        return;
      }

      let cancelled =
        false;

      async function loadStats() {
        try {
          setStatsLoading(
            true,
          );

          const {
            data,
            error,
          } =
            await supabase.rpc(
              "get_location_stats",
              {
                p_state:
                  state,

                p_municipality:
                  municipality,
              },
            );

          if (
            error
          ) {
            throw error;
          }

          if (
            cancelled
          ) {
            return;
          }

          const row =
            Array.isArray(
              data,
            )
              ? data[0]
              : data;

          setStats({
            productsCount:
              Number(
                row?.products_count ??
                  0,
              ),

            branchesCount:
              Number(
                row?.branches_count ??
                  0,
              ),

            pricesCount:
              Number(
                row?.prices_count ??
                  0,
              ),
          });

          console.log(
            "📊 ESTADÍSTICAS LOCALES:",
            row,
          );
        } catch (
          error
        ) {
          console.error(
            "Error cargando estadísticas locales:",
            error,
          );

          if (
            cancelled
          ) {
            return;
          }

          setStats({
            productsCount:
              0,

            branchesCount:
              0,

            pricesCount:
              0,
          });
        } finally {
          if (
            !cancelled
          ) {
            setStatsLoading(
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
    [
      authLoading,
      profileLoading,
      state,
      municipality,
    ],
  );

  /*
   * ========================================
   * FORMATO DE NÚMEROS
   * ========================================
   */

  const productsText =
    stats.productsCount.toLocaleString(
      "es-MX",
    );

  const branchesText =
    stats.branchesCount.toLocaleString(
      "es-MX",
    );

  const pricesText =
    stats.pricesCount.toLocaleString(
      "es-MX",
    );

  return (
    <main className="min-h-screen bg-white">

      {/* ==================================
          HERO / NAVEGACIÓN
      ================================== */}

      <Header />

      {/* ==================================
          FONDO DECORATIVO DE FRUTAS
      ================================== */}

      <div
        className="min-h-screen"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.88)), url('/public/images/fondo-frutas.jpg')",

          backgroundRepeat:
            "repeat",

          backgroundSize:
            "430px 430px",

          backgroundAttachment:
            "fixed",

          backgroundPosition:
            "center top",
        }}
      >

        {/* ==================================
            CONTENIDO PRINCIPAL
        ================================== */}

        <section className="relative z-10 mx-auto -mt-12 max-w-7xl px-5 pb-20 sm:px-7 lg:px-8">

      {/* ==================================
          MÉTRICAS
      ================================== */}

      <div className="rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)] sm:p-8">
        <div className="grid gap-6 text-center sm:grid-cols-3">

          {/* PRODUCTOS */}

          <div className="flex items-center justify-center gap-4 sm:block">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-xl">
              🏷️
            </div>

            <div>
              <p className="mt-2 text-3xl font-black text-green-600">
                {statsLoading
                  ? "..."
                  : productsText}
              </p>

              <p className="mt-1 text-sm font-bold text-slate-600">
                Productos con precio
              </p>

              {municipality && (
                <p className="mt-1 text-xs text-slate-400">
                  en {municipality}
                </p>
              )}
            </div>
          </div>

          {/* SUCURSALES */}

          <div className="flex items-center justify-center gap-4 border-slate-200 sm:block sm:border-x">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-xl">
              🏪
            </div>

            <div>
              <p className="mt-2 text-3xl font-black text-green-600">
                {statsLoading
                  ? "..."
                  : branchesText}
              </p>

              <p className="mt-1 text-sm font-bold text-slate-600">
                Sucursales con precios
              </p>

              <p className="mt-1 text-xs text-slate-400">
                disponibles en tu zona
              </p>
            </div>
          </div>

          {/* PRECIOS */}

          <div className="flex items-center justify-center gap-4 sm:block">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-xl">
              📈
            </div>

            <div>
              <p className="mt-2 text-3xl font-black text-green-600">
                {statsLoading
                  ? "..."
                  : pricesText}
              </p>

              <p className="mt-1 text-sm font-bold text-slate-600">
                Precios registrados
              </p>

              <p className="mt-1 text-xs text-slate-400">
                para comparar
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ==================================
          BUSCADOR + LISTA + CATEGORÍAS
      ================================== */}

      <div className="mt-8">
        <ProductList>
          <section
            id="ofertas"
            className="scroll-mt-24"
          >
            <StorePromotions />
          </section>
        </ProductList>
      </div>

        </section>

        {/* ==================================
            FOOTER
        ================================== */}

        <footer className="border-t border-slate-200/70 bg-white/90 px-6 py-10 text-center backdrop-blur-sm">
          <div className="mx-auto max-w-7xl">

            <p className="text-lg font-black text-green-700">
              🛒 Listik
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Compra con claridad. Ahorra en cada compra.
            </p>

          </div>
        </footer>

      </div>

    </main>
  );
}

/*
 * ==========================================
 * APP
 * ==========================================
 */

function HomeRoute() {
  const {
    user,
    profile,
    loading,
    profileLoading,
  } =
    useAuth();
    

  /*
   * Mientras Supabase determina sesión
   * y carga el perfil, no decidimos ruta.
   */

  if (
    loading ||
    profileLoading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-green-600" />

          <p className="mt-4 font-bold text-slate-500">
            Preparando Listik...
          </p>
        </div>
      </main>
    );
  }

  /*
   * Si no inició sesión, dejamos mostrar
   * el Home normalmente.
   */

  if (!user) {
    return <Home />;
  }

  /*
   * Si tenemos usuario pero todavía no
   * apareció su perfil, esperamos.
   */

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="font-bold text-slate-700">
            Preparando tu cuenta...
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Estamos cargando tu perfil de Listik.
          </p>
        </div>
      </main>
    );
  }

  /*
   * Usuario nuevo.
   */

  if (
    !profile.onboardingCompleted
  ) {
    return (
      <Navigate
        to="/crear-lista"
        replace
      />
    );
  }

  /*
   * Usuario existente.
   */

  return <Home />;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration:
            3000,

          style: {
            borderRadius:
              "16px",

            padding:
              "14px 18px",

            fontWeight:
              600,
          },
        }}
      />

      <Routes>
        {/* ==================================
            HOME
        ================================== */}

        <Route
          path="/"
          element={
            <Landing />
          }
        />

        <Route
          path="/app"
          element={
            <HomeRoute />
          }
        />
 {/* ==================================
      CANASTA BÁSICA
  ================================== */}

  <Route
          path="/canasta-basica"
          element={
            <ProtectedRoute>
              <BasicBasket />
            </ProtectedRoute>
          }
        />

        {/* ==================================
            BIENVENIDA
        ================================== */}

          <Route
          path="/historial"
          element={
            <ProtectedRoute>
              <PurchaseHistory />
            </ProtectedRoute>
          }
        />

<Route
  path="/admin/promociones"
  element={
    <AdminRoute>
      <AdminPromotions />
    </AdminRoute>
  }
/>

<Route
          path="/reporte-mensual"
          element={
            <ProtectedRoute>
              <MonthlyReport />
            </ProtectedRoute>
          }
        />


        <Route
          path="/bienvenido"
          element={
            <Welcome />
          }
        />

        {/* ==================================
            AUTH
        ================================== */}
        <Route
          path="/crear-lista"
          element={
            <ProtectedRoute>
              <CreateList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/crear-lista/revisar"
          element={
            <ProtectedRoute>
              <ReviewList />
            </ProtectedRoute>
          }
        />

          <Route
          path="/escanear-ticket"
          element={
            <ProtectedRoute>
              <TicketScannerPage />
            </ProtectedRoute>
          }
        />
<Route
  path="/admin/profeco"
  element={
    <AdminRoute>
      <AdminProfeco />
    </AdminRoute>
  }
/>

<Route
          path="/compra/resumen"
          element={
            <ProtectedRoute>
              <ShoppingTripSummaryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/login"
          element={
            <Login />
          }
        />

<Route
          path="/lista"
          element={
            <ProtectedRoute>
              <ShoppingListPage />
            </ProtectedRoute>
          }
        />

<Route
          path="/mi-lista/optimizar"
          element={
            <ProtectedRoute>
              <SmartPurchase />
            </ProtectedRoute>
          }
        />

<Route
          path="/compra"
          element={
            <ProtectedRoute>
              <ShoppingTripPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/registro"
          element={
            <Register />
          }
        />

       {/* ==================================
    ADMIN
================================== */}

<Route
  path="/admin"
  element={
    <AdminRoute>
      <Admin />
    </AdminRoute>
  }
/>

<Route
  path="/admin/productos"
  element={
    <AdminRoute>
      <AdminProducts />
    </AdminRoute>
  }
/>

<Route
  path="/admin/tickets"
  element={
    <AdminRoute>
      <AdminTickets />
    </AdminRoute>
  }
/>

<Route
  path="/admin/brain"
  element={
    <AdminRoute>
      <BrainDashboard />
    </AdminRoute>
  }
/>

<Route
  path="/admin/learning"
  element={
    <AdminRoute>
      <AdminLearning />
    </AdminRoute>
  }
/>
        {/* ==================================
            FALLBACK
        ================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;