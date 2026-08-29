import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface Props {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
}: Props) {
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-black transition ${
                active
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-6">
        {tabs.find(
          (tab) => tab.id === activeTab,
        )?.content ?? null}
      </div>
    </div>
  );
}