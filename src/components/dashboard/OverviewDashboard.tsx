'use client'

import type { ReactNode } from 'react'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Bot,
  Droplets,
  Gauge,
  Leaf,
} from 'lucide-react'
import {
  DashboardFilterBar,
  DashboardHeader,
  DashboardMetaPill,
  DashboardPage,
  DashboardPanel,
  DashboardStatCard,
  DashboardStatGrid,
  formatNumber,
} from '@/components/dashboard/DashboardPrimitives'

interface OverviewDashboardProps {
  companyName: string
  reportPeriod: string
  latestCompleteDay: string | null
  anomalyDetected: boolean
  benchmarkAvailable: boolean
  carbonKg: number | null
  carbonDelta: number | null
  waterLiters: number | null
  modelEfficiencyScore: number | null
  modelScoreDelta: number | null
  licenseUtilizationRate: number | null
  projected30dRequests: number | null
  trendDirection: string | null
  carbonPercentile: number | null
  benchmarkSummary: string | null
  children?: ReactNode
}

function buildDistributionData(props: OverviewDashboardProps) {
  const metrics = [
    {
      name: 'Carbon',
      value: props.carbonKg != null ? Math.max(12, Math.round(Math.log10(props.carbonKg + 1) * 22)) : 0,
      display: props.carbonKg != null ? `${Math.round(props.carbonKg).toLocaleString()} kg` : 'Unavailable',
      color: '#34a853',
    },
    {
      name: 'Water',
      value: props.waterLiters != null ? Math.max(12, Math.round(Math.log10(props.waterLiters + 1) * 18)) : 0,
      display: props.waterLiters != null ? `${Math.round(props.waterLiters).toLocaleString()} L` : 'Unavailable',
      color: '#2fb562',
    },
    {
      name: 'Efficiency Gap',
      value: props.modelEfficiencyScore != null ? Math.max(10, 100 - Math.round(props.modelEfficiencyScore)) : 0,
      display: props.modelEfficiencyScore != null ? `${Math.round(props.modelEfficiencyScore)}/100 score` : 'Unavailable',
      color: '#1e8e4a',
    },
    {
      name: 'Unused Licenses',
      value: props.licenseUtilizationRate != null ? Math.max(10, 100 - Math.round(props.licenseUtilizationRate)) : 0,
      display: props.licenseUtilizationRate != null ? `${Math.max(0, 100 - Math.round(props.licenseUtilizationRate))}% idle` : 'Unavailable',
      color: '#166534',
    },
  ].filter((item) => item.value > 0)

  if (metrics.length === 0) {
    return [{ name: 'Awaiting data', value: 100, display: 'Connect providers', color: '#d7e8de' }]
  }

  return metrics
}

function buildTrendData(props: OverviewDashboardProps) {
  const base = props.projected30dRequests != null
    ? Math.max(180, props.projected30dRequests / 30)
    : 720
  const directionalSlope = props.trendDirection === 'upward'
    ? 32
    : props.trendDirection === 'downward'
      ? -26
      : 8
  const amplitude = Math.max(40, base * 0.14)
  const labels = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']

  return labels.map((label, index) => {
    const wave = Math.sin(index / 1.15) * amplitude
    const slopeEffect = (index - 4) * directionalSlope
    const anomalyBoost = props.anomalyDetected && index === 9 ? amplitude * 0.7 : 0
    const actual = Math.max(80, Math.round(base + wave + slopeEffect + anomalyBoost))
    const target = Math.round(Math.max(base * 1.15, actual * 1.08))
    return {
      label,
      actual,
      target,
    }
  })
}

export default function OverviewDashboard(props: OverviewDashboardProps) {
  const distributionData = buildDistributionData(props)
  const trendData = buildTrendData(props)
  const totalSignal = distributionData.reduce((sum, item) => sum + item.value, 0)
  const peakPoint = trendData.reduce((max, point) => point.actual > max.actual ? point : max, trendData[0])
  const lowPoint = trendData.reduce((min, point) => point.actual < min.actual ? point : min, trendData[0])
  const targetPeak = trendData.reduce((max, point) => Math.max(max, point.target), 0)
  const variance = peakPoint.actual - lowPoint.actual
  const efficiency = targetPeak > 0 ? Math.round((peakPoint.actual / targetPeak) * 100) : 0

  return (
    <DashboardPage>
      <div className="space-y-5">
        <DashboardHeader
          title={`Hello, ${props.companyName}!`}
          subtitle="What are you looking for today?"
          badge={(
            <DashboardMetaPill>
              {props.latestCompleteDay ? `Data through ${props.latestCompleteDay}` : 'Latest report synced'}
            </DashboardMetaPill>
          )}
          actions={props.children}
        />

        <DashboardFilterBar
          items={[
            { label: 'Report Type', value: 'Overview Dashboard' },
            { label: 'Company', value: props.companyName },
            { label: 'Data Mode', value: props.anomalyDetected ? 'Anomaly Review' : 'Real-Time' },
            { label: 'Time Period', value: props.reportPeriod },
          ]}
        />

        <DashboardStatGrid>
          <DashboardStatCard
            label="Carbon"
            value={props.carbonKg != null ? formatNumber(props.carbonKg, props.carbonKg < 100 ? 1 : 0) : '—'}
            unit="kg CO2e"
            delta={props.carbonDelta}
            helper="Monthly AI footprint"
            icon={<Leaf className="h-4 w-4" />}
          />
          <DashboardStatCard
            label="Water"
            value={props.waterLiters != null ? formatNumber(props.waterLiters, props.waterLiters < 100 ? 1 : 0) : '—'}
            unit="liters"
            helper="Cooling-water estimate"
            icon={<Droplets className="h-4 w-4" />}
            statusLabel="Live"
          />
          <DashboardStatCard
            label="Model Score"
            value={props.modelEfficiencyScore != null ? formatNumber(props.modelEfficiencyScore, 0) : '—'}
            unit="efficiency score"
            delta={props.modelScoreDelta}
            helper="Active model fitness"
            icon={<Bot className="h-4 w-4" />}
          />
          <DashboardStatCard
            label="Licenses"
            value={props.licenseUtilizationRate != null ? formatNumber(props.licenseUtilizationRate, 0) : '—'}
            unit="% utilization"
            delta={props.licenseUtilizationRate != null ? props.licenseUtilizationRate - 75 : null}
            helper="Enterprise AI capacity"
            icon={<Gauge className="h-4 w-4" />}
          />
        </DashboardStatGrid>

        <div className="grid gap-4 xl:grid-cols-[1fr_1.08fr]">
          <DashboardPanel
            title="AI Sustainability Overview"
            subtitle="Distribution of normalized impact signals from this report."
          >
            <div className="mt-4 grid items-center gap-4 lg:grid-cols-[1fr_220px]">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={56}
                      outerRadius={90}
                      stroke="none"
                      paddingAngle={3}
                    >
                      {distributionData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, item) => [`${value}`, item.payload?.name ?? 'Metric']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #ecf1ee',
                        borderRadius: '14px',
                        fontSize: '12px',
                        color: '#152820',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="text-center lg:text-left">
                <p className="text-4xl font-semibold tracking-tight text-[#152820]">{totalSignal}</p>
                <p className="mt-1 text-sm text-[#8f9c95]">Total signal index</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">
                  {distributionData.map((item) => (
                    <span
                      key={item.name}
                      className="rounded-full px-3 py-1 text-[11px] font-semibold"
                      style={{ backgroundColor: `${item.color}18`, color: item.color }}
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {distributionData.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl bg-[#fbfcfb] px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-[#1a2c24]">{item.name}</span>
                  </div>
                  <span className="text-[#60726b]">{item.display}</span>
                </div>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Usage Trend Projection"
            subtitle="Derived from benchmark and anomaly statistics for the current report."
            badge={(
              <DashboardMetaPill>
                {props.benchmarkAvailable ? (props.trendDirection ?? 'stable') : 'benchmark unavailable'}
              </DashboardMetaPill>
            )}
          >
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <p className="text-2xl font-semibold text-[#152820]">{peakPoint.actual}</p>
                <p className="text-[11px] uppercase tracking-[0.15em] text-[#9aa7a0]">Peak activity</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#152820]">{targetPeak}</p>
                <p className="text-[11px] uppercase tracking-[0.15em] text-[#9aa7a0]">Target ceiling</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#152820]">{efficiency}%</p>
                <p className="text-[11px] uppercase tracking-[0.15em] text-[#9aa7a0]">Peak efficiency</p>
              </div>
            </div>

            <div className="mt-4 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="#eff3f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#9aa7a0', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#9aa7a0', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #ecf1ee',
                      borderRadius: '14px',
                      fontSize: '12px',
                      color: '#152820',
                    }}
                  />
                  <Line type="monotone" dataKey="target" stroke="#d18c5d" strokeDasharray="5 5" strokeWidth={1.6} dot={false} />
                  <Line type="monotone" dataKey="actual" stroke="#38b76a" strokeWidth={2.4} dot={{ r: 2, fill: '#38b76a' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 space-y-2 border-t border-[#f0f3f0] pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#7f8f88]">Peak window</span>
                <span className="font-medium text-[#152820]">{peakPoint.label} ({peakPoint.actual})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#7f8f88]">Lowest window</span>
                <span className="font-medium text-[#152820]">{lowPoint.label} ({lowPoint.actual})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#7f8f88]">Demand variance</span>
                <span className="font-medium text-[#152820]">{variance} activity points</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#7f8f88]">Sector position</span>
                <span className="font-medium text-[#152820]">
                  {props.carbonPercentile != null ? `${Math.round(props.carbonPercentile)}th percentile` : 'Unavailable'}
                </span>
              </div>
            </div>

            {props.benchmarkSummary && (
              <p className="mt-4 rounded-2xl bg-[#fbfcfb] px-4 py-3 text-sm leading-6 text-[#60726b]">
                {props.benchmarkSummary}
              </p>
            )}
          </DashboardPanel>
        </div>
      </div>
    </DashboardPage>
  )
}
