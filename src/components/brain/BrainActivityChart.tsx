import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  BrainActivityPoint,
} from "../../services/brainAnalyticsService";

interface Props {
  data: BrainActivityPoint[];
}

export default function BrainActivityChart({
  data,
}: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-widest text-green-600">
          Actividad
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-900">
          Crecimiento del Brain
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Memorias guardadas durante los
          últimos días.
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <AreaChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="date"
              tickFormatter={(value) =>
                new Date(
                  `${value}T00:00:00`,
                ).toLocaleDateString(
                  "es-MX",
                  {
                    day: "2-digit",
                    month: "short",
                  },
                )
              }
            />

            <YAxis
              allowDecimals={false}
            />

            <Tooltip
              labelFormatter={(value) =>
                new Date(
                  `${value}T00:00:00`,
                ).toLocaleDateString(
                  "es-MX",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                )
              }
            />

            <Area
              type="monotone"
              dataKey="memories"
              name="Memorias"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}