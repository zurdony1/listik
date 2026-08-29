import {
  CalendarDays,
  MapPin,
  Store,
  Wallet,
} from "lucide-react";

import type { TicketAnalysis } from "../../types/TicketAnalysis";

interface Props {
  analysis: TicketAnalysis;
}

export default function TicketSummary({
  analysis,
}: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-widest text-green-600">
        Ticket procesado
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
          <Store className="text-green-600" size={22} />

          <div>
            <p className="text-xs font-bold uppercase text-slate-400">
              Supermercado
            </p>

            <p className="font-black text-slate-900">
              {analysis.store}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
          <CalendarDays className="text-green-600" size={22} />

          <div>
            <p className="text-xs font-bold uppercase text-slate-400">
              Fecha
            </p>

            <p className="font-black text-slate-900">
              {analysis.date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
          <MapPin className="text-green-600" size={22} />

          <div>
            <p className="text-xs font-bold uppercase text-slate-400">
              Sucursal
            </p>

            <p className="font-black text-slate-900">
              {analysis.branch || "No identificada"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-green-50 p-4">
          <Wallet className="text-green-700" size={22} />

          <div>
            <p className="text-xs font-bold uppercase text-green-600">
              Total
            </p>

            <p className="text-2xl font-black text-green-700">
              $
              {analysis.total.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}