import {
  NavLink,
} from "react-router-dom";

const navItems = [
  {
    to: "/",
    label: "Inicio",
    end: true,
  },
  {
    to: "/lista",
    label: "Mi lista",
  },
  {
    to: "/compra",
    label: "Modo compra",
  },
];

export default function AppNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
        <NavLink
          to="/"
          className="shrink-0 font-black text-green-600"
        >
          🛒 Listik
        </NavLink>

        <nav className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
          {navItems.map(
            (
              item,
            ) => (
              <NavLink
                key={
                  item.to
                }
                to={
                  item.to
                }
                end={
                  item.end
                }
                className={({
                  isActive,
                }) =>
                  `rounded-xl px-3 py-2 text-xs font-black transition sm:px-4 sm:text-sm ${
                    isActive
                      ? "bg-white text-green-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`
                }
              >
                {
                  item.label
                }
              </NavLink>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}