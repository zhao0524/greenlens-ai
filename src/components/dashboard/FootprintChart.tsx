'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface FootprintChartProps {
  data: { model: string; carbon_kg: number }[]
}

export default function FootprintChart({ data }: FootprintChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[#7f8f88]">
        No footprint data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
        <CartesianGrid stroke="#edf1ee" vertical={false} />
        <XAxis
          dataKey="model"
          tick={{ fill: '#9aa7a0', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fill: '#9aa7a0', fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #edf1ee', borderRadius: '14px' }}
          labelStyle={{ color: '#152820' }}
          itemStyle={{ color: '#2e6a54' }}
          formatter={(value) => [`${Number(value).toFixed(3)} kg CO2e`, 'Carbon']}
        />
        <Bar dataKey="carbon_kg" fill="#38b76a" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
