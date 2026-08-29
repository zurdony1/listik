import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  supabase,
} from "../lib/supabase";

export default function Login() {
  const navigate =
    useNavigate();

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(
      null,
    );

    if (
      !email.trim() ||
      !password.trim()
    ) {
      setError(
        "Ingresa tu correo y contraseña.",
      );

      return;
    }

    try {
      setLoading(
        true,
      );

      const {
  data:
    signInData,

  error:
    signInError,
} =
  await supabase.auth.signInWithPassword({
    email:
      email.trim(),

    password,
  });

if (signInError) {
  throw signInError;
}

const signedUser =
  signInData.user;

if (!signedUser) {
  throw new Error(
    "No se pudo obtener el usuario.",
  );
}

const {
  data:
    adminRecord,

  error:
    adminError,
} =
  await supabase
    .from("admin_users")
    .select("user_id")
    .eq(
      "user_id",
      signedUser.id,
    )
    .maybeSingle();

if (adminError) {
  console.error(
    "Error verificando administrador:",
    adminError,
  );
}

if (adminRecord) {
  navigate(
    "/admin",
    {
      replace:
        true,
    },
  );

  return;
}

navigate(
  "/app",
  {
    replace:
      true,
  },
);
    } catch (
      caughtError
    ) {
      console.error(
        "Error iniciando sesión:",
        caughtError,
      );

      let message =
        "No se pudo iniciar sesión.";

      if (
        caughtError instanceof
          Error
      ) {
        message =
          caughtError.message;
      }

      /*
       * Mensajes más amigables.
       */

      const normalizedMessage =
        message.toLowerCase();

      if (
        normalizedMessage.includes(
          "invalid login credentials",
        )
      ) {
        message =
          "El correo o la contraseña no son correctos.";
      }

      if (
        normalizedMessage.includes(
          "email not confirmed",
        )
      ) {
        message =
          "Primero confirma tu correo electrónico para iniciar sesión.";
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

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto w-full max-w-md">

        {/* ======================================
            VOLVER A LANDING
        ====================================== */}

        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-green-700"
          >
            ← Volver a Listik
          </Link>
        </div>

        {/* ======================================
            ENCABEZADO
        ====================================== */}

        <div className="mb-8 text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-green-600">
            Listik
          </p>

          <h1 className="mt-3 text-4xl font-black text-slate-900">
            Bienvenido
          </h1>

          <p className="mt-3 text-slate-500">
            Inicia sesión para continuar con tus compras y consultar tu historial.
          </p>
        </div>

        {/* ======================================
            FORMULARIO
        ====================================== */}

        <form
          onSubmit={
            handleSubmit
          }
          className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
        >

          {/* CORREO */}

          <div>
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
              onChange={(
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
              autoComplete="current-password"
              value={
                password
              }
              onChange={(
                event,
              ) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="Tu contraseña"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            />
          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {/* BOTÓN */}

          <button
            type="submit"
            disabled={
              loading
            }
            className="mt-6 w-full rounded-2xl bg-green-600 px-5 py-4 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Entrando..."
              : "Iniciar sesión"}
          </button>

          {/* REGISTRO */}

          <p className="mt-5 text-center text-sm text-slate-500">
            ¿No tienes cuenta?{" "}
            <Link
              to="/registro"
              className="font-black text-green-600 transition hover:text-green-700"
            >
              Crear cuenta
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}