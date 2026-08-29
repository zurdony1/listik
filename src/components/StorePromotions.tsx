import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ShoppingCart,
  Store,
  Tag,
} from "lucide-react";

import {
  getStorePromotions,
  type StorePromotion,
} from "../services/storePromotionsService";

/*
 * ==========================================
 * DINERO
 * ==========================================
 */

function money(
  value:
    number,
) {
  return new Intl.NumberFormat(
    "es-MX",
    {
      style:
        "currency",

      currency:
        "MXN",

      minimumFractionDigits:
        2,
    },
  ).format(
    value,
  );
}

/*
 * ==========================================
 * FECHA
 * ==========================================
 */

function formatDate(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day:
        "numeric",

      month:
        "short",
    },
  ).format(
    new Date(
      value,
    ),
  );
}

/*
 * ==========================================
 * COMPONENTE
 * ==========================================
 */

export default function StorePromotions() {
  const [
    promotions,
    setPromotions,
  ] =
    useState<
      StorePromotion[]
    >([]);

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
    useState<
      string | null
    >(
      null,
    );

  /*
   * ==========================================
   * CARGAR
   * ==========================================
   */

  useEffect(
    () => {
      let cancelled =
        false;

      async function load() {
        try {
          setLoading(
            true,
          );

          setError(
            null,
          );

          const result =
            await getStorePromotions();

          if (
            !cancelled
          ) {
            setPromotions(
              result,
            );
          }
        } catch (
          caughtError
        ) {
          console.error(
            "Error cargando promociones:",
            caughtError,
          );

          if (
            !cancelled
          ) {
            setError(
              caughtError instanceof Error
                ? caughtError.message
                : "No pudimos cargar las promociones.",
            );
          }
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

      void load();

      return () => {
        cancelled =
          true;
      };
    },
    [],
  );

  /*
   * ==========================================
   * PROMOCIONES
   * ==========================================
   */

  const visiblePromotions =
    useMemo(
      () =>
        promotions,
      [
        promotions,
      ],
    );

  /*
   * ==========================================
   * SCROLL
   * ==========================================
   */

  function scroll(
    direction:
      "left" |
      "right",
  ) {
    const container =
      document.getElementById(
        "listik-store-promotions",
      );

    if (
      !container
    ) {
      return;
    }

    container.scrollBy({
      left:
        direction ===
        "right"
          ? 430
          : -430,

      behavior:
        "smooth",
    });
  }

  /*
   * ==========================================
   * AGREGAR
   * ==========================================
   *
   * Por ahora enviamos al producto.
   * Después lo conectaremos directamente
   * con useShoppingList.
   */

  function handleAdd(
    promotion:
      StorePromotion,
  ) {
    if (
      !promotion.productId
    ) {
      return;
    }

    window.location.href =
      `/app?producto=${encodeURIComponent(
        promotion.productId,
      )}`;
  }

  /*
   * ==========================================
   * LOADING
   * ==========================================
   */

  if (
    loading
  ) {
    return (
      <section className="mt-10">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">
            Promociones
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Promociones de supermercados
          </h2>
        </div>

        <div className="flex gap-4 overflow-hidden">
          {[
            1,
            2,
            3,
            4,
          ].map(
            (
              item,
            ) => (
              <div
                key={
                  item
                }
                className="h-[400px] min-w-[260px] animate-pulse rounded-3xl bg-slate-200"
              />
            ),
          )}
        </div>
      </section>
    );
  }

  /*
   * ==========================================
   * SIN PROMOCIONES
   * ==========================================
   */

  if (
    visiblePromotions.length ===
    0
  ) {
    return null;
  }

  return (
    <section className="mt-12">

      {/* ======================================
          ENCABEZADO
      ====================================== */}

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag
              size={17}
              className="text-orange-500"
            />

            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">
              Promociones cerca de ti
            </p>
          </div>

          <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
            Ofertas de supermercados
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Promociones publicadas por tiendas y supermercados.
          </p>
        </div>

        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            onClick={() =>
              scroll(
                "left",
              )
            }
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-green-300 hover:text-green-700"
          >
            <ChevronLeft
              size={20}
            />
          </button>

          <button
            type="button"
            onClick={() =>
              scroll(
                "right",
              )
            }
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-green-300 hover:text-green-700"
          >
            <ChevronRight
              size={20}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {/* ======================================
          CARRUSEL
      ====================================== */}

      <div
        id="listik-store-promotions"
        className="
          flex
          snap-x
          snap-mandatory
          gap-4
          overflow-x-auto
          pb-5
          [-ms-overflow-style:none]
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {visiblePromotions.map(
          (
            promotion,
          ) => {
            const saving =
              promotion.regularPrice &&
              promotion.regularPrice >
                promotion.promotionalPrice
                ? promotion.regularPrice -
                  promotion.promotionalPrice
                : null;

            const savingPercentage =
              promotion.regularPrice &&
              saving
                ? Math.round(
                    (
                      saving /
                      promotion.regularPrice
                    ) *
                      100,
                  )
                : null;

            return (
              <article
                key={
                  promotion.id
                }
                className="
                  group
                  min-w-[250px]
                  max-w-[250px]
                  sm:min-w-[280px]
                  sm:max-w-[280px]
                  snap-start
                  overflow-hidden
                  rounded-[1.7rem]
                  border
                  border-slate-200
                  bg-white
                  shadow-sm
                  transition
                  hover:-translate-y-1
                  hover:shadow-xl
                "
              >

                {/* IMAGEN */}

                <div className="relative h-[210px] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-green-50">
                  {promotion.imageUrl ? (
                    <img
                      src={
                        promotion.imageUrl
                      }
                      alt={
                        promotion.title
                      }
                      className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-6xl">
                      🛒
                    </div>
                  )}

                  {/* BADGE */}

                  <div className="absolute left-3 top-3 flex flex-col gap-2">
                    {promotion.isSponsored && (
                      <span className="w-fit rounded-lg bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                        Patrocinado
                      </span>
                    )}

                    {savingPercentage !==
                      null && (
                      <span className="w-fit rounded-lg bg-red-500 px-2.5 py-1 text-xs font-black text-white">
                        ↓ {savingPercentage}% OFF
                      </span>
                    )}
                  </div>
                </div>

                {/* CONTENIDO */}

                <div className="p-5 sm:p-6">

                  {/* TIENDA */}

                  <div className="flex items-center gap-2 text-xs font-black text-green-700">
                    <Store
                      size={14}
                    />

                    {promotion.storeName ??
                      "Supermercado"}
                  </div>

                  {/* PRODUCTO */}

                  <h3 className="mt-3 min-h-[48px] text-lg font-black leading-6 text-slate-950">
                    {promotion.title}
                  </h3>

                  {/* PRECIO */}

                  <div className="mt-4 flex flex-wrap items-end gap-2">
                    <p className="text-3xl font-black text-green-600">
                      {money(
                        promotion.promotionalPrice,
                      )}
                    </p>

                    {promotion.regularPrice && (
                      <p className="pb-1 text-sm font-bold text-slate-400 line-through">
                        {money(
                          promotion.regularPrice,
                        )}
                      </p>
                    )}
                  </div>

                  {/* AHORRO */}

                  {saving !==
                    null && (
                    <div className="mt-2 inline-flex rounded-lg bg-green-50 px-2.5 py-1 text-xs font-black text-green-700">
                      Ahorras{" "}
                      {money(
                        saving,
                      )}
                    </div>
                  )}

                  {/* SUCURSAL */}

                  {promotion.branchName && (
                    <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
                      <MapPin
                        size={14}
                        className="mt-0.5 shrink-0 text-green-600"
                      />

                      <span>
                        {promotion.branchName}
                      </span>
                    </div>
                  )}

                  {/* VIGENCIA */}

                  {promotion.endsAt && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
                      <CalendarDays
                        size={14}
                      />

                      Válido hasta{" "}
                      {formatDate(
                        promotion.endsAt,
                      )}
                    </div>
                  )}

                  {/* BOTÓN */}

                  {promotion.productId && (
                    <button
                      type="button"
                      onClick={() =>
                        handleAdd(
                          promotion,
                        )
                      }
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-green-200 bg-white px-4 py-3 font-black text-green-700 transition hover:border-green-300 hover:bg-green-50"
                    >
                      <ShoppingCart
                        size={18}
                      />

                      Agregar a mi lista
                    </button>
                  )}
                </div>
              </article>
            );
          },
        )}
      </div>
    </section>
  );
}