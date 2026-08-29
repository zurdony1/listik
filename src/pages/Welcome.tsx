import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../contexts/AuthContext";

export default function Welcome() {
  const navigate =
    useNavigate();

  const {
    user,
    profile,
  } =
    useAuth();

  const displayName =
    profile?.fullName
      ?.trim() ||
    user?.email ||
    "Usuario";

  const municipality =
    profile?.municipality
      ?.trim() ||
    null;

  const state =
    profile?.state
      ?.trim() ||
    null;

  function handleCreateList() {
  navigate(
    "/crear-lista",
  );
}

  function handleExplore() {
    navigate(
      "/",
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          {/* ==================================
              MENSAJE PRINCIPAL
          ================================== */}

          <section className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-black text-green-700">
              💚 Bienvenido a Listik
            </div>

            <h1 className="mt-6 max-w-2xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Empieza a comprar de forma más inteligente
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Hola{" "}
              <span className="font-black text-slate-900">
                {displayName}
              </span>
              . Puedes crear tu primera lista de compras o explorar precios y productos disponibles en tu zona.
            </p>

            {municipality &&
              state && (
                <div className="mt-6 w-fit rounded-2xl border border-green-100 bg-green-50 px-5 py-4">
                  <p className="text-xs font-black uppercase tracking-widest text-green-600">
                    Tu zona de compra
                  </p>

                  <p className="mt-1 text-lg font-black text-slate-900">
                    📍{" "}
                    {
                      municipality
                    }
                    ,{" "}
                    {
                      state
                    }
                  </p>
                </div>
              )}

            <div className="mt-8 max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black text-slate-900">
                ¿Por qué empezar con una lista?
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Agrega los productos que necesitas y Listik compara los precios disponibles para ayudarte a decidir dónde comprar.
              </p>
            </div>
          </section>

          {/* ==================================
              OPCIONES
          ================================== */}

          <section className="flex flex-col justify-center gap-5">
            {/* CREAR LISTA */}

            <button
              type="button"
              onClick={
                handleCreateList
              }
              className="group rounded-3xl border-2 border-green-500 bg-green-600 p-7 text-left text-white shadow-lg transition hover:-translate-y-1 hover:bg-green-700 hover:shadow-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-3xl">
                  🛒
                </div>

                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                  Recomendado
                </span>
              </div>

              <h2 className="mt-6 text-2xl font-black">
                Crear mi primera lista
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-green-50">
                Busca tus productos, agrégalos a tu lista y descubre qué tienda o combinación de tiendas te conviene más.
              </p>

              <div className="mt-6 flex items-center gap-2 text-sm font-black">
                Empezar mi lista

                <span className="transition group-hover:translate-x-1">
                  →
                </span>
              </div>
            </button>

            {/* EXPLORAR */}

            <button
              type="button"
              onClick={
                handleExplore
              }
              className="group rounded-3xl border border-slate-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:border-green-200 hover:shadow-lg"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                🔎
              </div>

              <h2 className="mt-6 text-2xl font-black text-slate-900">
                Explorar productos y precios
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Revisa categorías, compara productos y conoce los precios disponibles en supermercados de tu zona.
              </p>

              <div className="mt-6 flex items-center gap-2 text-sm font-black text-green-600">
                Ir al catálogo

                <span className="transition group-hover:translate-x-1">
                  →
                </span>
              </div>
            </button>

            <p className="text-center text-xs font-medium text-slate-400">
              Puedes cambiar de opción en cualquier momento.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}