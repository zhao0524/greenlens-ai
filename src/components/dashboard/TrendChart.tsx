'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TrendChartProps {
  data: { date: string; requests: number }[]
}

export default function TrendChart({ data }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[#7f8f88]">
        No trend data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#edf1ee" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#9aa7a0', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#9aa7a0', fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #edf1ee', borderRadius: '14px' }}
          labelStyle={{ color: '#152820' }}
          itemStyle={{ color: '#2e6a54' }}
        />
        <Line type="monotone" dataKey="requests" stroke="#38b76a" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
