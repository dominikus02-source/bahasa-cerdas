"use client";

import { cn } from "@/lib/utils";

export interface AgentCardProps {
  id: string;
  name: string;
  description: string;
  useCase: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

export function AgentCard({ id, name, description, useCase, icon, active, onClick }: AgentCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200 w-full border",
        active
          ? "bg-emerald-50 border-emerald-200 shadow-sm"
          : "bg-white border-gray-100 hover:border-emerald-100 hover:bg-emerald-50/30"
      )}
    >
      <div className={cn(
        "p-2 rounded-lg flex-shrink-0 mt-0.5",
        active ? "bg-emerald-100 text-emerald-700" : "bg-gray-50 text-gray-400"
      )}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold", active ? "text-emerald-800" : "text-gray-800")}>
          {name}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{description}</p>
        <p className="text-[10px] text-gray-400 mt-1">
          <span className="font-medium">Cocok untuk:</span> {useCase}
        </p>
      </div>
    </button>
  );
}
