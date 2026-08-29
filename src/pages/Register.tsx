import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState("");
  const [municipality, setMunicipality] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    // ==========================================
    // VALIDACIONES
    // ==========================================

    if (
      !fullName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !state.trim() ||
      !municipality.trim()
    ) {
      setError("Completa todos los campos.");
      return;
    }

    if (password.length < 6) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );
      return;
    }

    try {
      setLoading(true);

      // ==========================================
      // CREAR USUARIO EN SUPABASE AUTH
      // ==========================================

      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,

          options: {
            // Después de confirmar el correo,
            // Supabase regresará al usuario aquí.
            emailRedirectTo:
              `${window.location.origin}/login`,

            // Estos datos llegan al trigger
            // handle_new_user() que creamos.
            data: {
              full_name: fullName.trim(),
              state: state.trim(),
              municipality: municipality.trim(),
            },
          },
        });

      if (signUpError) {
        throw signUpError;
      }

      // ==========================================
      // SI SUPABASE CREA SESIÓN INMEDIATAMENTE
      // ==========================================

     if (data.session) {
  navigate(
    "/app",
    {
      replace: true,
    },
  );

  return;
}

      // ==========================================
      // CONFIRMACIÓN POR EMAIL ACTIVADA
      // ==========================================

      setSuccess(
        "¡Cuenta creada! Te enviamos un correo de confirmación. Revisa tu bandeja de entrada."
      );
    } catch (caughtError) {
      console.error(
        "Error creando usuario:",
        caughtError
      );

      let message =
        "No se pudo crear la cuenta.";

      if (caughtError instanceof Error) {
        message = caughtError.message;
      }

      // Mensajes un poco más amigables
      if (
        message
          .toLowerCase()
          .includes("already registered")
      ) {
        message =
          "Este correo ya está registrado. Intenta iniciar sesión.";
      }

      if (
        message
          .toLowerCase()
          .includes("rate limit") ||
        message
          .toLowerCase()
          .includes("security purposes")
      ) {
        message =
          "Espera un momento antes de volver a solicitar el registro.";
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto w-full max-w-lg">
        {/* ======================================
            ENCABEZADO
        ====================================== */}

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

        {/* ======================================
            FORMULARIO
        ====================================== */}

        <form
          onSubmit={handleSubmit}
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
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
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
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
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
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Mínimo 6 caracteres"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            />
          </div>

          {/* ======================================
              UBICACIÓN
          ====================================== */}

          <div className="mt-7 rounded-2xl border border-green-100 bg-green-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-green-600">
              📍 Tu zona de compra
            </p>

            <p className="mt-2 text-sm text-green-800">
              Listik usará esta ubicación para
              mostrar precios relevantes.
            </p>

            {/* ESTADO */}

            <div className="mt-4">
              <label
                htmlFor="state"
                className="text-sm font-black text-slate-800"
              >
                Estado
              </label>

              <input
                id="state"
                type="text"
                value={state}
                onChange={(event) =>
                  setState(event.target.value)
                }
                placeholder="Ejemplo: Yucatán"
                className="mt-2 w-full rounded-xl border border-green-200 bg-white px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
              />
            </div>

            {/* MUNICIPIO */}

            <div className="mt-4">
              <label
                htmlFor="municipality"
                className="text-sm font-black text-slate-800"
              >
                Ciudad / Municipio
              </label>

              <input
                id="municipality"
                type="text"
                value={municipality}
                onChange={(event) =>
                  setMunicipality(event.target.value)
                }
                placeholder="Ejemplo: Mérida"
                className="mt-2 w-full rounded-xl border border-green-200 bg-white px-4 py-3 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
              />
            </div>
          </div>

          {/* ======================================
              ERROR
          ====================================== */}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {/* ======================================
              ÉXITO
          ====================================== */}

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

          {/* ======================================
              CREAR CUENTA
          ====================================== */}

          <button
            type="submit"
            disabled={loading}
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