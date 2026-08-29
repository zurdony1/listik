import {
  Link,
} from "react-router-dom";

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  MapPin,
  ReceiptText,
  Search,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
  Store,
  WalletCards,
} from "lucide-react";

import {
  useAuth,
} from "../contexts/AuthContext";

const features = [
  {
    icon:
      Search,

    title:
      "Compara precios",

    description:
      "Busca productos y revisa precios disponibles en supermercados de tu zona.",
  },

  {
    icon:
      ShoppingBasket,

    title:
      "Organiza tu lista",

    description:
      "Crea tu lista antes de salir y mantén tus compras organizadas desde un solo lugar.",
  },

  {
    icon:
      Store,

    title:
      "Planea dónde comprar",

    description:
      "Listik te ayuda a evaluar opciones de compra considerando precios y tiendas disponibles.",
  },

  {
    icon:
      ReceiptText,

    title:
      "Guarda tus tickets",

    description:
      "Escanea tus tickets y conviértelos en un historial de compras fácil de consultar.",
  },

  {
    icon:
      WalletCards,

    title:
      "Controla tus gastos",

    description:
      "Consulta cuánto has gastado durante el mes y cuál es tu ticket promedio.",
  },

  {
    icon:
      BarChart3,

    title:
      "Entiende tus compras",

    description:
      "Revisa reportes mensuales y descubre en qué supermercados se concentra tu gasto.",
  },
];

const steps = [
  {
    number:
      "01",

    icon:
      Search,

    title:
      "Busca y agrega",

    description:
      "Encuentra los productos que necesitas y agrégalos a tu lista de compras.",
  },

  {
    number:
      "02",

    icon:
      ShoppingCart,

    title:
      "Compra con tu lista",

    description:
      "Lleva tu lista contigo y marca los productos conforme avanzas por el supermercado.",
  },

  {
    number:
      "03",

    icon:
      ReceiptText,

    title:
      "Guarda tu ticket",

    description:
      "Al terminar, escanea tu ticket para registrar el gasto real de la compra.",
  },

  {
    number:
      "04",

    icon:
      BarChart3,

    title:
      "Revisa tu mes",

    description:
      "Listik reúne tus compras y te muestra cuánto gastaste y dónde compraste más.",
  },
];

export default function Landing() {
  const {
    user,
    loading,
  } =
    useAuth();

  const primaryUrl =
    user
      ? "/app"
      : "/registro";

  const primaryLabel =
    user
      ? "Entrar a Listik"
      : "Crear cuenta gratis";

  return (
    <main className="min-h-screen bg-white text-slate-950">
      {/* ======================================
          NAVBAR
      ====================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-600 text-xl text-white shadow-sm">
              🛒
            </div>

            <div>
              <p className="text-xl font-black tracking-tight text-slate-950">
                Listik
              </p>

              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-green-600">
                Compra con claridad
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <a
              href="#como-funciona"
              className="text-sm font-bold text-slate-600 transition hover:text-green-700"
            >
              Cómo funciona
            </a>

            <a
              href="#funciones"
              className="text-sm font-bold text-slate-600 transition hover:text-green-700"
            >
              Funciones
            </a>

            <a
              href="#gastos"
              className="text-sm font-bold text-slate-600 transition hover:text-green-700"
            >
              Tus gastos
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {!loading &&
              !user && (
              <Link
                to="/login"
                className="hidden rounded-xl px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
              >
                Iniciar sesión
              </Link>
            )}

            {!loading && (
              <Link
                to={
                  primaryUrl
                }
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-green-700"
              >
                {primaryLabel}

                <ArrowRight
                  size={16}
                />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ======================================
          HERO
      ====================================== */}

      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="absolute -right-40 -top-32 h-[34rem] w-[34rem] rounded-full bg-green-100/70 blur-3xl" />

        <div className="absolute -left-48 bottom-0 h-80 w-80 rounded-full bg-emerald-50 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-green-700">
              <Sparkles
                size={15}
              />

              Tu compra, más organizada
            </div>

            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.03] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Compra mejor.
              <span className="block text-green-600">
                Entiende tus gastos.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Listik te ayuda a comparar precios, organizar tu lista,
              guardar tus tickets y conocer cuánto gastas cada mes.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {!loading && (
                <Link
                  to={
                    primaryUrl
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-green-600/15 transition hover:-translate-y-0.5 hover:bg-green-700"
                >
                  {primaryLabel}

                  <ArrowRight
                    size={19}
                  />
                </Link>
              )}

              {!loading &&
                !user && (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-black text-slate-700 transition hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                >
                  Ya tengo cuenta
                </Link>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-slate-500">
              <span className="flex items-center gap-2">
                <CheckCircle2
                  size={17}
                  className="text-green-600"
                />

                Lista de compras
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2
                  size={17}
                  className="text-green-600"
                />

                Comparación de precios
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2
                  size={17}
                  className="text-green-600"
                />

                Historial de gastos
              </span>
            </div>
          </div>

          {/* HERO VISUAL */}

          <div className="relative">
            <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-lime-200/60 via-emerald-100/70 to-orange-100/60 blur-3xl" />

            <div className="relative grid grid-cols-12 gap-3">
              <div className="col-span-8 overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1769499311767-bce1cf9b4549?auto=format&fit=crop&q=85&w=1400"
                  alt="Supermercado con frutas y productos"
                  className="h-[340px] w-full object-cover sm:h-[410px]"
                />
              </div>

              <div className="col-span-4 grid gap-3">
                <div className="overflow-hidden rounded-[1.6rem] border-4 border-white shadow-xl">
                  <img
                    src="https://images.unsplash.com/photo-1711211351053-8384f5fb623a?auto=format&fit=crop&q=85&w=900"
                    alt="Sección de frutas y verduras"
                    className="h-[165px] w-full object-cover sm:h-[198px]"
                  />
                </div>

                <div className="rounded-[1.6rem] bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 p-5 text-slate-950 shadow-xl">
                  <p className="text-xs font-black uppercase tracking-[0.16em]">
                    Compra inteligente
                  </p>

                  <p className="mt-2 text-3xl font-black">
                    🥑 🍅 🍌
                  </p>

                  <p className="mt-3 text-sm font-black">
                    Precios, lista y gastos en un solo lugar.
                  </p>
                </div>
              </div>

              <div className="absolute -bottom-7 left-6 rounded-2xl border border-green-100 bg-white p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-xl">
                    🧾
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400">
                      Ticket guardado
                    </p>

                    <p className="font-black text-slate-950">
                      Compra registrada ✓
                    </p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 top-7 hidden rounded-2xl bg-slate-950 px-5 py-4 text-white shadow-xl sm:block">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-green-300">
                  Tu mes
                </p>

                <p className="mt-1 text-2xl font-black">
                  $8,435
                </p>

                <p className="text-xs text-slate-300">
                  en compras registradas
                </p>
              </div>
            </div>
          </div>        </div>
      </section>


      {/* ======================================
          CATEGORÍAS VISUALES
      ====================================== */}

      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                emoji: "🥬",
                title: "Frutas y verduras",
                className: "from-lime-100 to-green-50 text-green-900",
              },
              {
                emoji: "🥖",
                title: "Pan y despensa",
                className: "from-amber-100 to-orange-50 text-amber-950",
              },
              {
                emoji: "🥛",
                title: "Lácteos",
                className: "from-sky-100 to-blue-50 text-sky-950",
              },
              {
                emoji: "🧼",
                title: "Hogar y limpieza",
                className: "from-violet-100 to-fuchsia-50 text-violet-950",
              },
              {
                emoji: "🛒",
                title: "Supermercados",
                className: "from-rose-100 to-pink-50 text-rose-950",
              },
            ].map(
              (
                item,
              ) => (
                <div
                  key={item.title}
                  className={`rounded-2xl bg-gradient-to-br p-4 ${item.className}`}
                >
                  <p className="text-3xl">
                    {item.emoji}
                  </p>

                  <p className="mt-2 text-sm font-black">
                    {item.title}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ======================================
          CÓMO FUNCIONA
      ====================================== */}

      <section
        id="como-funciona"
        className="bg-slate-50"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
              Cómo funciona
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              De la lista al reporte mensual
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              Listik acompaña tu compra desde que empiezas a planear
              hasta que quieres entender cuánto gastaste.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {steps.map(
              (
                step,
              ) => {
                const Icon =
                  step.icon;

                return (
                  <article
                    key={
                      step.number
                    }
                    className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm before:absolute before:-right-8 before:-top-8 before:h-24 before:w-24 before:rounded-full before:bg-green-50"
                  >
                    <span className="text-sm font-black text-green-600">
                      {step.number}
                    </span>

                    <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                      <Icon
                        size={23}
                      />
                    </div>

                    <h3 className="mt-5 text-xl font-black text-slate-950">
                      {step.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {step.description}
                    </p>
                  </article>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* ======================================
          FUNCIONES
      ====================================== */}

      <section
        id="funciones"
        className="bg-white"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
              Todo en un solo lugar
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Una herramienta para comprar y entender tus gastos
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map(
              (
                feature,
              ) => {
                const Icon =
                  feature.icon;

                return (
                  <article
                    key={
                      feature.title
                    }
                    className="group rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-green-200 hover:shadow-xl hover:shadow-slate-900/5"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700 transition group-hover:bg-green-600 group-hover:text-white">
                      <Icon
                        size={23}
                      />
                    </div>

                    <h3 className="mt-5 text-xl font-black text-slate-950">
                      {feature.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {feature.description}
                    </p>
                  </article>
                );
              },
            )}
          </div>
        </div>
      </section>


      {/* ======================================
          EXPERIENCIA DE SUPERMERCADO
      ====================================== */}

      <section className="bg-gradient-to-br from-emerald-50 via-white to-orange-50">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="grid grid-cols-2 gap-4">
              <div className="overflow-hidden rounded-[2rem] shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1711211351053-8384f5fb623a?auto=format&fit=crop&q=85&w=1000"
                  alt="Frutas y verduras frescas"
                  className="h-[340px] w-full object-cover"
                />
              </div>

              <div className="mt-10 overflow-hidden rounded-[2rem] shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1769499311767-bce1cf9b4549?auto=format&fit=crop&q=85&w=1000"
                  alt="Interior de supermercado"
                  className="h-[340px] w-full object-cover"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
                Tu compra cotidiana
              </p>

              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Del pasillo del súper a tu historial.
              </h2>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                Listik conecta lo que buscas, lo que compras y lo que gastas.
                Puedes comparar opciones, organizar tu lista y guardar tus tickets
                para tener una visión mucho más clara de tus compras.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  ["🥑", "Productos frescos"],
                  ["🏪", "Supermercados de tu zona"],
                  ["💸", "Precios y promociones"],
                  ["📊", "Historial y reportes"],
                ].map(
                  (
                    [emoji, label],
                  ) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-2xl border border-white bg-white/80 p-4 shadow-sm backdrop-blur"
                    >
                      <span className="text-2xl">
                        {emoji}
                      </span>

                      <span className="text-sm font-black text-slate-800">
                        {label}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================
          GASTOS
      ====================================== */}

      <section
        id="gastos"
        className="bg-slate-950"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-green-300">
              <BarChart3
                size={15}
              />

              Reportes mensuales
            </div>

            <h2 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl">
              No solo compres.
              <span className="block text-green-400">
                Aprende de tus gastos.
              </span>
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Al guardar tus compras, Listik puede mostrarte cuánto
              gastaste durante el mes, cuántas veces compraste y en qué
              tiendas se concentró tu dinero.
            </p>

            <div className="mt-8 space-y-4">
              {[
                "Gasto total del mes",
                "Número de compras",
                "Ticket promedio",
                "Gasto por supermercado",
                "Comparación con el mes anterior",
              ].map(
                (
                  text,
                ) => (
                  <div
                    key={
                      text
                    }
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2
                      size={19}
                      className="shrink-0 text-green-400"
                    />

                    <span className="font-bold text-slate-200">
                      {text}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="rounded-3xl bg-white p-6">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-green-600">
                Agosto
              </p>

              <p className="mt-2 text-3xl font-black text-slate-950">
                $14,523.36
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-400">
                gasto registrado
              </p>

              <div className="mt-6 space-y-4">
                {[
                  {
                    name:
                      "Soriana",

                    percent:
                      42,

                    total:
                      "$6,100",
                  },

                  {
                    name:
                      "Sam's Club",

                    percent:
                      31,

                    total:
                      "$4,502",
                  },

                  {
                    name:
                      "Bodega Aurrera",

                    percent:
                      18,

                    total:
                      "$2,614",
                  },
                ].map(
                  (
                    store,
                  ) => (
                    <div
                      key={
                        store.name
                      }
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-black text-slate-800">
                          {store.name}
                        </p>

                        <p className="text-sm font-black text-slate-600">
                          {store.total}
                        </p>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-green-600"
                          style={{
                            width:
                              `${store.percent}%`,
                          }}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================
          UBICACIÓN / PRECIOS LOCALES
      ====================================== */}

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-8 rounded-[2rem] border border-green-100 bg-green-50 p-7 sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-green-600 text-white shadow-lg shadow-green-600/20">
              <MapPin
                size={34}
              />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
                Precios que tengan sentido para ti
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Compara opciones disponibles en tu zona
              </h2>

              <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                Los precios y supermercados pueden cambiar según la
                ubicación. Listik utiliza la zona configurada por el
                usuario para ayudarte a consultar opciones más relevantes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================
          CTA FINAL
      ====================================== */}

      <section className="border-t border-slate-100 bg-gradient-to-r from-green-50 via-lime-50 to-orange-50">
        <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-green-600">
            Empieza con tu próxima compra
          </p>

          <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Tu lista, tus tickets y tus gastos en un solo lugar.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Crea tu cuenta y empieza a construir un historial más claro
            de tus compras.
          </p>

          {!loading && (
            <Link
              to={
                primaryUrl
              }
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-green-600 px-7 py-4 font-black text-white shadow-lg shadow-green-600/15 transition hover:bg-green-700"
            >
              {primaryLabel}

              <ArrowRight
                size={19}
              />
            </Link>
          )}
        </div>
      </section>

      {/* ======================================
          FOOTER
      ====================================== */}

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              🛒
            </span>

            <span className="font-black text-slate-950">
              Listik
            </span>
          </div>

          <p className="text-sm text-slate-400">
            Organiza tus compras. Entiende tus gastos.
          </p>
        </div>
      </footer>
    </main>
  );
}
