'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface FootprintChartProps {
  data: { model: string; carbon_kg: number }[]
  selectedModel?: string | null
}

// Darkest = highest emitter, lightest = lowest (used when no selection)
const GREEN_SHADES = [
  '#14532d',
  '#166534',
  '#15803d',
  '#16a34a',
  '#22c55e',
  '#38b76a',
  '#4ade80',
  '#86efac',
]

export default function FootprintChart({ data, selectedModel }: FootprintChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[#4a5e56]">
        No footprint data available
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.carbon_kg - a.carbon_kg)
  const hasSelection = selectedModel != null

  return (
    <ResponsiveContainer width="99%" height="100%">
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        barCategoryGap="30%"
      >
        <CartesianGrid stroke="#edf1ee" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#5a6e66', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v} kg`}
        />
        <YAxis
          type="category"
          dataKey="model"
          tick={{ fill: '#2e4a40', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={140}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #edf1ee', borderRadius: '14px' }}
          labelStyle={{ color: '#152820' }}
          itemStyle={{ color: '#2e6a54' }}
          formatter={(value) => [`${Number(value).toFixed(3)} kg CO2e`, 'Carbon']}
        />
        <Bar dataKey="carbon_kg" radius={[0, 6, 6, 0]} maxBarSize={32}>
          {sorted.map((entry, index) => (
            <Cell
              key={entry.model}
              fill={hasSelection && entry.model !== selectedModel ? '#d1d5db' : GREEN_SHADES[index % GREEN_SHADES.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
