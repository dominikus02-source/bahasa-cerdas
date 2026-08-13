"use client"

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export function TrendBadge({ value }: { value: number }) {
  if (value === 0) return <span className="flex items-center gap-0.5 text-xs text-slate-400"><Minus size={12} /> 0%</span>
  if (value > 0) return <span className="flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium"><TrendingUp size={12} /> +{value}%</span>
  return <span className="flex items-center gap-0.5 text-xs text-red-500 dark:text-red-400 font-medium"><TrendingDown size={12} /> {value}%</span>
}

export function UserGrowthChart({ data }: { data: { week: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
        <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorUsers)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function MiniBarChart({ data }: { data: { week: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
      </BarChart>
    </ResponsiveContainer>
  )
}
