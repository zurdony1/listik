export default function SearchBar() {
  return (
    <div className="flex gap-3">

      <input
        type="text"
        placeholder="Buscar productos..."
        className="flex-1 rounded-xl border border-gray-300 px-5 py-4 outline-none focus:ring-2 focus:ring-green-500"
      />

      <button className="bg-green-600 text-white px-6 rounded-xl hover:bg-green-700 transition">
        Buscar
      </button>

    </div>
  );
}