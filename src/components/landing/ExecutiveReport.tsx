import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Droplets,
  TrendingDown,
  TrendingUp,
  Zap
} from 'lucide-react';

interface Trend {
  value: string;
  direction: 'up' | 'down' | 'warning';
  positive?: boolean;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  trend?: Trend;
}

const MetricCard = ({ icon, label, value, unit, trend }: MetricCardProps) => (
  <div className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-4">
    <div className="mb-3 flex items-center gap-2 text-[#666]">
      {icon}
      <span className="text-xs uppercase tracking-wide">{label}</span>
    </div>
    <div className="mb-1 flex items-baseline gap-2">
      <span className="text-2xl font-medium text-[#236b42] lg:text-3xl">{value}</span>
      <span className="text-sm text-[#666]">{unit}</span>
    </div>
    {trend && (
      <div
        className={`flex items-center gap-1 text-xs ${
          trend.direction === 'warning' ? 'text-amber-600' : trend.positive ? 'text-[#236b42]' : 'text-red-500'
        }`}
      >
        {trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
        {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
        {trend.direction === 'warning' && <AlertTriangle className="h-3 w-3" />}
        <span>{trend.value}</span>
      </div>
    )}
  </div>
);

const ExecutiveReport = () => {
  return (
    <div className="bg-white p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between border-b border-[#e5e5e5] pb-6">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#4C7060]">
              <BarChart3 className="h-5 w-5 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-lg font-medium text-[#1a1a1a]">GreenLens AI</span>
          </div>
          <h2 className="text-xl font-medium text-[#1a1a1a] lg:text-2xl">Monthly AI Impact Briefing</h2>
          <p className="mt-1 text-sm text-[#666]">November 2025 | Acme Corporation</p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="mb-1 text-xs uppercase tracking-wide text-[#888]">Report Period</p>
          <p className="text-sm text-[#333]">Nov 1 - Nov 30, 2025</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={<BarChart3 className="h-4 w-4" strokeWidth={1.5} />}
          label="Carbon Footprint"
          value="847"
          unit="kg CO2e"
          trend={{ value: '12% vs last month', direction: 'down', positive: true }}
        />
        <MetricCard
          icon={<Droplets className="h-4 w-4" strokeWidth={1.5} />}
          label="Water Usage"
          value="12.4K"
          unit="liters"
          trend={{ value: '8% vs last month', direction: 'up', positive: false }}
        />
        <MetricCard
          icon={<Zap className="h-4 w-4" strokeWidth={1.5} />}
          label="License Utilization"
          value="67%"
          unit="active"
          trend={{ value: '5% vs last month', direction: 'up', positive: true }}
        />
        <MetricCard
          icon={<AlertTriangle className="h-4 w-4" strokeWidth={1.5} />}
          label="Cost at Risk"
          value="$48K"
          unit="annual"
          trend={{ value: 'renewal in 47 days', direction: 'warning' }}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-[#1a1a1a]">Carbon Emissions Trend</p>
            <div className="flex items-center gap-4 text-xs text-[#666]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#4C7060]" />
                This month
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#d4d4d4]" />
                Last month
              </span>
            </div>
          </div>
          <div className="flex h-32 items-end gap-2">
            {[
              { current: 65, previous: 70 },
              { current: 72, previous: 75 },
              { current: 58, previous: 68 },
              { current: 80, previous: 85 },
              { current: 75, previous: 90 },
              { current: 68, previous: 78 },
              { current: 82, previous: 88 },
              { current: 70, previous: 82 },
              { current: 65, previous: 75 },
              { current: 78, previous: 85 },
              { current: 72, previous: 80 },
              { current: 68, previous: 76 }
            ].map((data, index) => (
              <div key={index} className="flex flex-1 gap-0.5">
                <div className="flex-1 rounded-t-sm bg-[#d4d4d4]" style={{ height: `${data.previous}%` }} />
                <div className="flex-1 rounded-t-sm bg-[#4C7060]" style={{ height: `${data.current}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-[#888]">
            <span>Week 1</span>
            <span>Week 2</span>
            <span>Week 3</span>
            <span>Week 4</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-5">
          <p className="mb-4 text-sm font-medium text-[#1a1a1a]">By Provider</p>
          <div className="space-y-4">
            {[
              { name: 'Azure OpenAI', percentage: 45, value: '381 kg' },
              { name: 'OpenAI API', percentage: 30, value: '254 kg' },
              { name: 'M365 Copilot', percentage: 18, value: '152 kg' },
              { name: 'Other', percentage: 7, value: '60 kg' }
            ].map(provider => (
              <div key={provider.name}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-[#333]">{provider.name}</span>
                  <span className="text-[#666]">{provider.value}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e5e5e5]">
                  <div className="h-full rounded-full bg-[#4C7060]" style={{ width: `${provider.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-5">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#4C7060]" strokeWidth={1.5} />
          <p className="text-sm font-medium text-[#1a1a1a]">Recommended Actions</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              priority: 'High',
              action: 'Consolidate Azure regions',
              impact: 'Reduce carbon footprint by 18%',
              savings: '$12K/year'
            },
            {
              priority: 'Medium',
              action: 'Right-size Copilot licenses',
              impact: 'Recover 33% unused capacity',
              savings: '$36K/year'
            },
            {
              priority: 'Low',
              action: 'Shift batch jobs to off-peak',
              impact: 'Lower water usage by 15%',
              savings: 'Environmental'
            }
          ].map(rec => (
            <div key={rec.action} className="rounded-lg border border-[#e5e5e5] bg-white p-4">
              <span
                className={`mb-2 inline-block rounded px-2 py-0.5 text-xs ${
                  rec.priority === 'High'
                    ? 'bg-[#f0f5f3] text-[#4C7060]'
                    : rec.priority === 'Medium'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-[#f5f5f5] text-[#666]'
                }`}
              >
                {rec.priority}
              </span>
              <p className="mb-1 text-sm font-medium text-[#1a1a1a]">{rec.action}</p>
              <p className="mb-2 text-xs text-[#666]">{rec.impact}</p>
              <p className="text-xs text-[#4C7060]">{rec.savings}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExecutiveReport;
