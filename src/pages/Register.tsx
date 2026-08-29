import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  supabase,
} from "../lib/supabase";

import {
  getAvailableLocations,
  type AvailableLocation,
} from "../services/locationService";

/*
 * ==========================================
 * REGISTRO
 * ==========================================
 */

export default function Register() {
  const navigate =
    useNavigate();

  /*
   * ========================================
   * DATOS DEL USUARIO
   * ========================================
   */

  const [
    fullName,
    setFullName,
  ] =
    useState(
      "",
    );

  const [
    email,
    setEmail,
  ] =
    useState(
      "",
    );

  const [
    password,
    setPassword,
  ] =
    useState(
      "",
    );

  /*
   * ========================================
   * UBICACIÓN
   * ========================================
   */

  const [
    state,
    setState,
  ] =
    useState(
      "",
    );

  const [
    municipality,
    setMunicipality,
  ] =
    useState(
      "",
    );

  const [
    availableLocations,
    setAvailableLocations,
  ] =
    useState<
      AvailableLocation[]
    >([]);

  const [
    locationsLoading,
    setLocationsLoading,
  ] =
    useState(
      true,
    );

  const [
    locationsError,
    setLocationsError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  /*
   * ========================================
   * ESTADO DEL FORMULARIO
   * ========================================
   */

  const [
    loading,
    setLoading,
  ] =
    useState(
      false,
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

  const [
    success,
    setSuccess,
  ] =
    useState<
      string | null
    >(
      null,
    );

  /*
   * ========================================
   * CARGAR COBERTURA
   * ========================================
   */

  useEffect(
    () => {
      let cancelled =
        false;

      async function loadLocations() {
        try {
          setLocationsLoading(
            true,
          );

          setLocationsError(
            null,
          );

          const locations =
            await getAvailableLocations();

          if (
            cancelled
          ) {
            return;
          }

          setAvailableLocations(
            locations,
          );
        } catch (
          caughtError
        ) {
          console.error(
            "Error cargando cobertura:",
            caughtError,
          );

          if (
            cancelled
          ) {
            return;
          }

          setLocationsError(
            caughtError instanceof Error
              ? caughtError.message
              : "No pudimos cargar las zonas disponibles.",
          );
        } finally {
          if (
            !cancelled
          ) {
            setLocationsLoading(
              false,
            );
          }
        }
      }

      void loadLocations();

      return () => {
        cancelled =
          true;
      };
    },
    [],
  );

  /*
   * ========================================
   * ESTADOS DISPONIBLES
   * ========================================
   */

  const states =
    useMemo(
      () => {
        const unique =
          new Map<
            string,
            string
          >();

        for (
          const location
          of availableLocations
        ) {
          const key =
            location.state
              .trim()
              .toLowerCase();

          if (
            !unique.has(
              key,
            )
          ) {
            unique.set(
              key,
              location.state.trim(),
            );
          }
        }

        return [
          ...unique.values(),
        ].sort(
          (
            a,
            b,
          ) =>
            a.localeCompare(
              b,
              "es-MX",
              {
                sensitivity:
                  "base",
              },
            ),
        );
      },
      [
        availableLocations,
      ],
    );

  /*
   * ========================================
   * MUNICIPIOS DEL ESTADO
   * ========================================
   */

  const municipalities =
    useMemo(
      () => {
        if (
          !state
        ) {
          return [];
        }

        const unique =
          new Map<
            string,
            string
          >();

        for (
          const location
          of availableLocations
        ) {
          if (
            location.state
              .trim()
              .toLowerCase() !==
            state
              .trim()
              .toLowerCase()
          ) {
            continue;
          }

          const value =
            location.municipality.trim();

          const key =
            value.toLowerCase();

          if (
            !unique.has(
              key,
            )
          ) {
            unique.set(
              key,
              value,
            );
          }
        }

        return [
          ...unique.values(),
        ].sort(
          (
            a,
            b,
          ) =>
            a.localeCompare(
              b,
              "es-MX",
              {
                sensitivity:
                  "base",
              },
            ),
        );
      },
      [
        availableLocations,
        state,
      ],
    );

  /*
   * ========================================
   * CAMBIAR ESTADO
   * ========================================
   */

  function handleStateChange(
    nextState:
      string,
  ) {
    setState(
      nextState,
    );

    /*
     * Al cambiar de estado,
     * limpiamos el municipio anterior.
     */

    setMunicipality(
      "",
    );
  }

  /*
   * ========================================
   * ENVIAR REGISTRO
   * ========================================
   */

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(
      null,
    );

    setSuccess(
      null,
    );

    /*
     * ======================================
     * VALIDACIONES
     * ======================================
     */

    if (
      !fullName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !state.trim() ||
      !municipality.trim()
    ) {
      setError(
        "Completa todos los campos.",
      );

      return;
    }

    if (
      password.length <
      6
    ) {
      setError(
        "La contraseña debe tener al menos 6 caracteres.",
      );

      return;
    }

    /*
     * ======================================
     * VALIDAR QUE LA ZONA EXISTA
     * ======================================
     */

    const validLocation =
      availableLocations.some(
        (
          location,
        ) =>
          location.state
            .trim()
            .toLowerCase() ===
            state
              .trim()
              .toLowerCase() &&
          location.municipality
            .trim()
            .toLowerCase() ===
            municipality
              .trim()
              .toLowerCase(),
      );

    if (
      !validLocation
    ) {
      setError(
        "Selecciona una ubicación disponible en Listik.",
      );

      return;
    }

    try {
      setLoading(
        true,
      );

      /*
       * ====================================
       * CREAR USUARIO
       * ====================================
       */

      const {
        data,
        error:
          signUpError,
      } =
        await supabase.auth.signUp({
          email:
            email
              .trim()
              .toLowerCase(),

          password,

          options: {
            /*
             * Después de confirmar
             * el correo regresamos
             * a Listik.
             */

            emailRedirectTo:
              `${window.location.origin}/login`,

            /*
             * Estos datos llegan
             * al trigger handle_new_user().
             *
             * IMPORTANTE:
             * state y municipality ya
             * provienen de nuestra propia
             * lista de cobertura.
             */

            data: {
              full_name:
                fullName.trim(),

              state:
                state.trim(),

              municipality:
                municipality.trim(),
            },
          },
        });

      if (
        signUpError
      ) {
        throw signUpError;
      }

      /*
       * ====================================
       * SESIÓN INMEDIATA
       * ====================================
       *
       * Esto ocurre si la confirmación
       * por email está desactivada.
       */

      if (
        data.session
      ) {
        navigate(
          "/app",
          {
            replace:
              true,
          },
        );

        return;
      }

      /*
       * ====================================
       * CONFIRMACIÓN DE EMAIL
       * ====================================
       */

      setSuccess(
        "¡Cuenta creada! Te enviamos un correo de confirmación. Revisa tu bandeja de entrada.",
      );
    } catch (
      caughtError
    ) {
      console.error(
        "Error creando usuario:",
        caughtError,
      );

      let message =
        "No se pudo crear la cuenta.";

      if (
        caughtError instanceof
        Error
      ) {
        message =
          caughtError.message;
      }

      const normalizedMessage =
        message.toLowerCase();

      /*
       * ====================================
       * CORREO EXISTENTE
       * ====================================
       */

      if (
        normalizedMessage.includes(
          "already registered",
        ) ||
        normalizedMessage.includes(
          "already been registered",
        ) ||
        normalizedMessage.includes(
          "user already registered",
        )
      ) {
        message =
          "Este correo ya está registrado. Intenta iniciar sesión.";
      }

      /*
       * ====================================
       * RATE LIMIT
       * ====================================
       */

      if (
        normalizedMessage.includes(
          "rate limit",
        ) ||
        normalizedMessage.includes(
          "security purposes",
        ) ||
        normalizedMessage.includes(
          "email rate limit",
        )
      ) {
        message =
          "Has realizado varios intentos seguidos. Espera un momento y vuelve a intentar.";
      }

      /*
       * ====================================
       * CONTRASEÑA
       * ====================================
       */

      if (
        normalizedMessage.includes(
          "password",
        ) &&
        normalizedMessage.includes(
          "characters",
        )
      ) {
        message =
          "La contraseña no cumple con los requisitos de seguridad.";
      }

      setError(
        message,
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  /*
   * ========================================
   * UI
   * ========================================
   */

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto w-full max-w-lg">

        {/* ==================================
            ENCABEZADO
        ================================== */}

        <div className="mb-8 text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-green-600">
            LISTIK
          </p>

          <h1 className="mt-3 text-4xl font-black text-slate-900">
            Crea tu cuenta
          </h1>

          <p className="mt-3 text-slate-500">
            Configura tu ubicación para mostrarte
            precios y supermercados de tu zona.
          </p>
        </div>

        {/* ==================================
            FORMULARIO
        ================================== */}

        <form
          onSubmit={
            handleSubmit
          }
          className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
        >

          {/* NOMBRE */}

          <div>
            <label
              htmlFor="full-name"
              className="text-sm font-black text-slate-800"
            >
              Nombre
            </label>

            <input
              id="full-name"
              type="text"
              autoComplete="name"
              value={
                fullName
              }
              onChange={
                (
                  event,
                ) =>
                  setFullName(
                    event.target.value,
                  )
              }
              placeholder="Tu nombre"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            />
          </div>

          {/* CORREO */}

          <div className="mt-5">
            <label
              htmlFor="email"
              className="text-sm font-black text-slate-800"
            >
              Correo
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={
                email
              }
              onChange={
                (
                  event,
                ) =>
                  setEmail(
                    event.target.value,
                  )
              }
              placeholder="correo@ejemplo.com"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            />
          </div>

          {/* CONTRASEÑA */}

          <div className="mt-5">
            <label
              htmlFor="password"
              className="text-sm font-black text-slate-800"
            >
              Contraseña
            </label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={
                password
              }
              onChange={
                (
                  event,
                ) =>
                  setPassword(
                    event.target.value,
                  )
              }
              placeholder="Mínimo 6 caracteres"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            />
          </div>

          {/* ==================================
              UBICACIÓN
          ================================== */}

          <div className="mt-7 rounded-2xl border border-green-100 bg-green-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-green-600">
              📍 Tu zona de compra
            </p>

            <p className="mt-2 text-sm text-green-800">
              Selecciona tu ubicación. Solo mostramos
              zonas donde Listik tiene precios disponibles.
            </p>

            {/* ERROR DE COBERTURA */}

            {locationsError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                {locationsError}
              </div>
            )}

            {/* ESTADO */}

            <div className="mt-4">
              <label
                htmlFor="state"
                className="text-sm font-black text-slate-800"
              >
                Estado
              </label>

              <select
                id="state"
                value={
                  state
                }
                disabled={
                  locationsLoading ||
                  states.length ===
                    0
                }
                onChange={
                  (
                    event,
                  ) =>
                    handleStateChange(
                      event.target.value,
                    )
                }
                className="mt-2 w-full rounded-xl border border-green-200 bg-white px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {locationsLoading
                    ? "Cargando estados..."
                    : "Selecciona tu estado"}
                </option>

                {states.map(
                  (
                    stateOption,
                  ) => (
                    <option
                      key={
                        stateOption
                      }
                      value={
                        stateOption
                      }
                    >
                      {stateOption}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* MUNICIPIO */}

            <div className="mt-4">
              <label
                htmlFor="municipality"
                className="text-sm font-black text-slate-800"
              >
                Ciudad / Municipio
              </label>

              <select
                id="municipality"
                value={
                  municipality
                }
                disabled={
                  !state ||
                  municipalities.length ===
                    0
                }
                onChange={
                  (
                    event,
                  ) =>
                    setMunicipality(
                      event.target.value,
                    )
                }
                className="mt-2 w-full rounded-xl border border-green-200 bg-white px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {!state
                    ? "Primero selecciona tu estado"
                    : municipalities.length ===
                        0
                    ? "No hay municipios disponibles"
                    : "Selecciona tu ciudad o municipio"}
                </option>

                {municipalities.map(
                  (
                    municipalityOption,
                  ) => (
                    <option
                      key={
                        municipalityOption
                      }
                      value={
                        municipalityOption
                      }
                    >
                      {municipalityOption}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* COBERTURA SELECCIONADA */}

            {state &&
              municipality && (
                <div className="mt-4 rounded-xl border border-green-200 bg-white p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-green-600">
                    Zona seleccionada
                  </p>

                  <p className="mt-1 text-sm font-black text-green-900">
                    📍 {municipality}, {state}
                  </p>
                </div>
              )}
          </div>

          {/* ==================================
              ERROR DEL REGISTRO
          ================================== */}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {/* ==================================
              ÉXITO
          ================================== */}

          {success && (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">
              {success}

              <div className="mt-3">
                <Link
                  to="/login"
                  className="font-black text-green-700 underline"
                >
                  Ir a iniciar sesión
                </Link>
              </div>
            </div>
          )}

          {/* ==================================
              BOTÓN
          ================================== */}

          <button
            type="submit"
            disabled={
              loading ||
              locationsLoading ||
              !state ||
              !municipality
            }
            className="mt-6 w-full rounded-2xl bg-green-600 px-5 py-4 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Creando cuenta..."
              : "Crear mi cuenta"}
          </button>

          <p className="mt-5 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{" "}

            <Link
              to="/login"
              className="font-black text-green-600 hover:text-green-700"
            >
              Iniciar sesión
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}