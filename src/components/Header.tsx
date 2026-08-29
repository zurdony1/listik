import {
  useState,
} from "react";

import {
  ChevronDown,
  Flame,
  History,
  ListChecks,
  LogOut,
  MapPin,
  ReceiptText,
  ShoppingCart,
  Store,
  User,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../contexts/AuthContext";

export default function Header() {
  const navigate =
    useNavigate();

  const {
    user,
    profile,
    signOut,
  } =
    useAuth();

  const [
    userMenuOpen,
    setUserMenuOpen,
  ] =
    useState(false);

  const displayName =
    profile?.fullName ??
    user?.email ??
    "Usuario";

  const hasLocation =
    Boolean(
      profile?.municipality &&
      profile?.state,
    );

  /*
   * ==========================================
   * CERRAR SESIÓN
   * ==========================================
   */

  async function handleSignOut() {
    try {
      await signOut();

      window.location.replace(
        "/",
      );
    } catch (
      error
    ) {
      console.error(
        "Error cerrando sesión:",
        error,
      );
    }
  }

  /*
   * ==========================================
   * IR A OFERTAS
   * ==========================================
   */

  function handleOffersClick() {
    const section =
      document.getElementById(
        "ofertas",
      );

    if (section) {
      section.scrollIntoView({
        behavior:
          "smooth",

        block:
          "start",
      });

      return;
    }

    /*
     * Si por alguna razón estamos fuera
     * del Home, regresamos primero.
     */

    navigate(
      "/app",
    );

    window.setTimeout(
      () => {
        document
          .getElementById(
            "ofertas",
          )
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start",
          });
      },
      350,
    );
  }

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 text-white">

      {/* ======================================
          DECORACIÓN
      ====================================== */}

      <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-white/10" />

      <div className="pointer-events-none absolute -bottom-48 -left-32 h-[420px] w-[420px] rounded-full bg-emerald-900/10" />

      <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-5 sm:px-7 lg:px-8">

        {/* ======================================
            NAVBAR
        ====================================== */}

        <nav className="flex items-center justify-between gap-5">

          {/* LOGO */}

          <button
            type="button"
            onClick={() =>
              navigate(
                "/app",
              )
            }
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-green-700 shadow-lg">
              <ShoppingCart
                size={21}
              />
            </div>

            <div>
              <p className="text-xl font-black leading-none">
                Listik
              </p>

              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-green-100">
                Compra inteligente
              </p>
            </div>
          </button>

          {/* NAVEGACIÓN */}

          <div className="hidden items-center gap-1 rounded-2xl bg-emerald-900/15 p-1 lg:flex">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/app",
                )
              }
              className="rounded-xl px-4 py-2 text-sm font-bold transition hover:bg-white/10"
            >
              Inicio
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/lista",
                )
              }
              className="rounded-xl px-4 py-2 text-sm font-bold transition hover:bg-white/10"
            >
              Mi lista
            </button>

            <button
              type="button"
              onClick={
                handleOffersClick
              }
              className="rounded-xl px-4 py-2 text-sm font-bold transition hover:bg-white/10"
            >
              Ofertas
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/historial",
                )
              }
              className="rounded-xl px-4 py-2 text-sm font-bold transition hover:bg-white/10"
            >
              Mis compras
            </button>
          </div>

          {/* ACCIONES */}

          <div className="flex items-center gap-2">

            {/* ESCANEAR TICKET */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/escanear-ticket",
                )
              }
              className="hidden items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black backdrop-blur transition hover:bg-white/20 sm:flex"
            >
              <ReceiptText
                size={16}
              />

              Escanear ticket
            </button>

            {/* USUARIO */}

            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setUserMenuOpen(
                      (
                        current,
                      ) =>
                        !current,
                    )
                  }
                  className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur transition hover:bg-white/20"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-green-700">
                    <User
                      size={16}
                    />
                  </div>

                  <div className="hidden max-w-[150px] text-left md:block">
                    <p className="truncate text-xs font-black">
                      {displayName}
                    </p>

                    {hasLocation && (
                      <p className="mt-0.5 truncate text-[10px] font-semibold text-green-100">
                        📍{" "}
                        {
                          profile
                            ?.municipality
                        }
                      </p>
                    )}
                  </div>

                  <ChevronDown
                    size={15}
                  />
                </button>

                {/* MENÚ DESPLEGABLE */}

                {userMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-2xl">

                    <div className="border-b border-slate-100 px-3 py-3">
                      <p className="truncate text-sm font-black">
                        {displayName}
                      </p>

                      {hasLocation && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin
                            size={12}
                          />

                          {
                            profile
                              ?.municipality
                          }
                          ,{" "}
                          {
                            profile
                              ?.state
                          }
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(
                          false,
                        );

                        navigate(
                          "/lista",
                        );
                      }}
                      className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-slate-50"
                    >
                      <ListChecks
                        size={17}
                      />

                      Mi lista
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(
                          false,
                        );

                        navigate(
                          "/historial",
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-slate-50"
                    >
                      <History
                        size={17}
                      />

                      Mis compras
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(
                          false,
                        );

                        navigate(
                          "/escanear-ticket",
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-slate-50"
                    >
                      <ReceiptText
                        size={17}
                      />

                      Escanear ticket
                    </button>

                    <div className="my-2 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() =>
                        void handleSignOut()
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50"
                    >
                      <LogOut
                        size={17}
                      />

                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* ======================================
            HERO
        ====================================== */}

        <div className="grid items-center gap-10 pb-4 pt-14 lg:grid-cols-[1fr_0.9fr] lg:pt-16">

          {/* IZQUIERDA */}

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">
              <Flame
                size={15}
              />

              <span className="text-xs font-black uppercase tracking-wider">
                Ahorra en tu próxima compra
              </span>
            </div>

            <h2 className="mt-6 max-w-xl text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
              Tu súper,
              <span className="block text-lime-200">
                al mejor precio.
              </span>
            </h2>

            <p className="mt-6 max-w-xl text-base leading-7 text-green-50 sm:text-lg">
              Compara precios entre supermercados de tu zona, organiza tu lista y descubre dónde te conviene comprar.
            </p>

            {/* BOTONES */}

            <div className="mt-8 flex flex-wrap gap-3">

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/lista",
                  )
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-black text-green-700 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
              >
                <ShoppingCart
                  size={18}
                />

                Ir a mi lista
              </button>

              <button
                type="button"
                onClick={
                  handleOffersClick
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 py-3.5 font-black text-white backdrop-blur transition hover:bg-white/20"
              >
                <Flame
                  size={18}
                />

                Ver ofertas
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/escanear-ticket",
                  )
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 py-3.5 font-black text-white backdrop-blur transition hover:bg-white/20 lg:hidden"
              >
                <ReceiptText
                  size={18}
                />

                Escanear ticket
              </button>

            </div>

            {/* UBICACIÓN */}

            {hasLocation && (
              <div className="mt-7 inline-flex items-center gap-3 text-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                  <MapPin
                    size={17}
                  />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-green-200">
                    Comparando en tu zona
                  </p>

                  <p className="font-black">
                    {
                      profile
                        ?.municipality
                    }
                    ,{" "}
                    {
                      profile
                        ?.state
                    }
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ======================================
              IMAGEN
          ====================================== */}

          <div className="relative hidden min-h-[390px] lg:block">

            <div className="absolute inset-4 rounded-[40px] bg-emerald-950/20" />

            <div className="absolute inset-x-10 bottom-4 top-0 overflow-hidden rounded-[36px] border border-white/20 bg-white shadow-2xl">
              <img
                src="/images/images.jpg"
                alt="Supermercado con frutas, verduras y productos"
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
            </div>

            {/* MEJOR PRECIO */}

            <div className="absolute bottom-0 left-0 z-10 w-56 rounded-3xl border border-slate-100 bg-white p-5 text-slate-900 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-green-600">
                  Mejor precio
                </span>

                <span className="text-xl">
                  🥑
                </span>
              </div>

              <p className="mt-3 font-black">
                Aguacate Hass
              </p>

              <p className="mt-1 text-3xl font-black text-green-600">
                $38.50
              </p>

              <p className="text-xs font-semibold text-slate-400">
                por kilogramo
              </p>

              <div className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-xs font-black text-green-700">
                Ahorras hasta $12.40
              </div>
            </div>

            {/* TIENDAS */}

            <div className="absolute right-0 top-8 z-10 rounded-3xl border border-white/70 bg-white/95 p-4 text-slate-900 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-2">
                <Store
                  size={17}
                  className="text-green-600"
                />

                <p className="text-xs font-black uppercase text-slate-500">
                  Comparando
                </p>
              </div>

              <p className="mt-2 text-xl font-black">
                4 tiendas
              </p>

              <p className="mt-1 text-xs text-slate-500">
                cerca de ti
              </p>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}