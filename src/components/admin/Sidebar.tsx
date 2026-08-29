import {
  Bot,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  supabase,
} from "../../lib/supabase";

interface MenuItem {
  title: string;

  path: string;

  icon:
    React.ComponentType<{
      size?: number;
      className?: string;
    }>;
}

const menu:
  MenuItem[] =
  [
    {
      title:
        "Dashboard",

      path:
        "/admin",

      icon:
        LayoutDashboard,
    },

    {
      title:
        "Productos",

      path:
        "/admin/productos",

      icon:
        Package,
    },

    {
      title:
        "Supermercados",

      path:
        "/admin/supermercados",

      icon:
        Store,
    },

    {
      title:
        "Precios",

      path:
        "/admin/precios",

      icon:
        DollarSign,
    },

    {
      title:
        "Tickets IA",

      path:
        "/admin/tickets",

      icon:
        Bot,
    },

    {
      title:
        "Promociones",

      path:
        "/admin/promociones",

      icon:
        Megaphone,
    },

    {
      title:
        "Usuarios",

      path:
        "/admin/usuarios",

      icon:
        Users,
    },

    {
      title:
        "PROFECO",

      path:
        "/admin/profeco",

      icon:
        ShoppingBag,
    },

    {
      title:
        "Configuración",

      path:
        "/admin/configuracion",

      icon:
        Settings,
    },
  ];

export default function Sidebar() {
  const navigate =
    useNavigate();

async function handleSignOut() {
  try {
    const {
      error,
    } =
      await supabase.auth.signOut();

    if (
      error
    ) {
      throw error;
    }

    /*
     * Regresamos a la Landing pública.
     * replace evita que "Atrás" vuelva al Admin.
     */
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

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-slate-200 bg-white">

      {/* ======================================
          LOGO
      ====================================== */}

      <div className="border-b border-slate-200 p-8">
        <h1 className="text-3xl font-black text-green-600">
          LISTIK
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Admin Panel
        </p>
      </div>

      {/* ======================================
          NAVEGACIÓN
      ====================================== */}

      <nav className="flex-1 overflow-y-auto p-4">

        {menu.map(
          (
            item,
          ) => {
            const Icon =
              item.icon;

            return (
              <NavLink
                key={
                  item.title
                }
                to={
                  item.path
                }
                end={
                  item.path ===
                  "/admin"
                }
                className={({
                  isActive,
                }) =>
                  [
                    "mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold transition",

                    isActive
                      ? "bg-green-50 text-green-700"
                      : "text-slate-700 hover:bg-green-50 hover:text-green-700",
                  ].join(
                    " ",
                  )
                }
              >
                <Icon
                  size={20}
                />

                {item.title}
              </NavLink>
            );
          },
        )}
      </nav>

      {/* ======================================
          ACCIONES DE CUENTA
      ====================================== */}

      <div className="border-t border-slate-200 p-4">

        <button
          type="button"
          onClick={() =>
            navigate(
              "/app",
            )
          }
          className="mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          <Store
            size={20}
          />

          Ir a Listik
        </button>

        <button
  type="button"
  onClick={() =>
    void handleSignOut()
  }
  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold text-red-600 transition hover:bg-red-50"
>
  <LogOut
    size={20}
  />

  Cerrar sesión
</button>
      </div>
    </aside>
  );
}