export default function Navbar() {
  return (
    <nav className="bg-green-600 text-white shadow-lg">
      <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">

        <h1 className="text-2xl font-bold">
          🛒 Listik
        </h1>

        <button className="bg-white text-green-600 px-4 py-2 rounded-lg font-semibold">
          Iniciar sesión
        </button>

      </div>
    </nav>
  );
}