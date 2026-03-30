'use client';

import { memo, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Database,
  Droplets,
  FileText,
  Link2,
  Menu,
  X,
  Zap
} from 'lucide-react';
import ExecutiveReport from '@/components/landing/ExecutiveReport';

const problemHighlights = [
  'No carbon data.',
  'No water metrics.',
  'No license utilization insights.'
];

const solutionTabs = [
  { id: 0, label: 'Carbon & Water' },
  { id: 1, label: 'License Utilization' },
  { id: 2, label: 'Executive Report' }
];

const carbonTrend = [
  { current: 65, previous: 70 },
  { current: 72, previous: 75 },
  { current: 58, previous: 68 },
  { current: 80, previous: 85 },
  { current: 75, previous: 90 },
  { current: 68, previous: 78 },
  { current: 82, previous: 88 },
  { current: 70, previous: 82 }
];

const providerBreakdown = [
  { name: 'Azure OpenAI', percentage: 45, value: '381 kg CO2e' },
  { name: 'OpenAI API', percentage: 30, value: '254 kg CO2e' },
  { name: 'M365 Copilot', percentage: 18, value: '152 kg CO2e' },
  { name: 'Other', percentage: 7, value: '60 kg CO2e' }
];

const utilizationByTeam = [
  { team: 'Product', utilization: 81 },
  { team: 'Operations', utilization: 74 },
  { team: 'Support', utilization: 58 },
  { team: 'Finance', utilization: 42 }
];

const renewalRisks = [
  { label: 'Azure OpenAI', value: '47 days', tone: 'amber' },
  { label: 'Microsoft 365 Copilot', value: '124 days', tone: 'green' }
] as const;

const recommendedActions = [
  'Consolidate Azure regions to reduce carbon by 18%',
  'Right-size Copilot licenses for Finance team',
  'Move batch jobs to off-peak processing windows'
];

const workflowSteps = [
  {
    step: '1',
    icon: <Link2 className="h-5 w-5" strokeWidth={1.5} />,
    title: 'Connect providers',
    description: 'Link your AI infrastructure across OpenAI, Azure, Microsoft 365, and more.'
  },
  {
    step: '2',
    icon: <Database className="h-5 w-5" strokeWidth={1.5} />,
    title: 'Aggregate usage',
    description: 'Collect usage, licensing, and reporting telemetry into one decision layer.'
  },
  {
    step: '3',
    icon: <Calculator className="h-5 w-5" strokeWidth={1.5} />,
    title: 'Model impact',
    description: 'Translate infrastructure activity into carbon, water, and renewal risk signals.'
  },
  {
    step: '4',
    icon: <FileText className="h-5 w-5" strokeWidth={1.5} />,
    title: 'Brief leadership',
    description: 'Deliver an executive-ready monthly report with actions and cost exposure.'
  }
];

const RadarVisual = memo(function RadarVisual() {
  return (
    <div className="relative mx-auto flex max-w-[30rem] justify-center">
      <svg
        viewBox="0 0 300 300"
        className="h-[18rem] w-[18rem] sm:h-[22rem] sm:w-[22rem] lg:h-[24rem] lg:w-[24rem]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sweepGradient" x1="150" y1="150" x2="274" y2="78" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#86efac" stopOpacity="0" />
            <stop offset="70%" stopColor="#86efac" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#86efac" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        <line x1="5" y1="150" x2="295" y2="150" stroke="#236b42" strokeOpacity="0.15" strokeWidth="0.5" />
        <line x1="150" y1="5" x2="150" y2="295" stroke="#236b42" strokeOpacity="0.15" strokeWidth="0.5" />
        <line x1="47" y1="47" x2="253" y2="253" stroke="#236b42" strokeOpacity="0.08" strokeWidth="0.5" />
        <line x1="253" y1="47" x2="47" y2="253" stroke="#236b42" strokeOpacity="0.08" strokeWidth="0.5" />

        {[36, 72, 108, 144].map(radius => (
          <circle
            key={radius}
            cx="150"
            cy="150"
            r={radius}
            fill="none"
            stroke="#236b42"
            strokeOpacity="0.15"
            strokeWidth="0.5"
          />
        ))}
        <circle cx="150" cy="150" r="145" fill="none" stroke="#236b42" strokeOpacity="0.25" strokeWidth="1" />

        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 150 150"
            to="360 150 150"
            dur="8s"
            repeatCount="indefinite"
          />
          <path d="M150,150 L150,6 A144,144 0 0,1 274.6,78 Z" fill="url(#sweepGradient)" />
          <line x1="150" y1="150" x2="150" y2="6" stroke="#86efac" strokeOpacity="0.2" strokeWidth="1" />
        </g>

        <g>
          <animate
            attributeName="opacity"
            values="0;0;1;0;0"
            keyTimes="0;0.13;0.14;0.49;1"
            dur="8s"
            repeatCount="indefinite"
          />
          <circle cx="208" cy="98" r="4" fill="#ef4444" />
          <text x="202" y="90" fill="#ef4444" fontSize="8" fontFamily="monospace" textAnchor="end">
            DATA_ERROR: NULL
          </text>
        </g>

        <g>
          <animate
            attributeName="opacity"
            values="0;0;1;0;0"
            keyTimes="0;0.636;0.646;0.986;1"
            dur="8s"
            repeatCount="indefinite"
          />
          <circle cx="92" cy="198" r="3" fill="#60a5fa" />
          <text x="98" y="194" fill="#60a5fa" fontSize="8" fontFamily="monospace" textAnchor="start">
            WATER_INDEX: NA
          </text>
        </g>

        <g>
          <animate
            attributeName="opacity"
            values="0;0;1;0;0"
            keyTimes="0;0.362;0.372;0.722;1"
            dur="8s"
            repeatCount="indefinite"
          />
          <circle cx="215" cy="205" r="4" fill="#f59e0b" />
          <text x="209" y="216" fill="#f59e0b" fontSize="8" fontFamily="monospace" textAnchor="end">
            CARBON: UNKNOWN
          </text>
        </g>

        <g>
          <animate
            attributeName="opacity"
            values="0.45;0;0;1;0.45"
            keyTimes="0;0.22;0.864;0.874;1"
            dur="8s"
            repeatCount="indefinite"
          />
          <circle cx="75" cy="85" r="3" fill="#ef4444" />
          <text x="81" y="82" fill="#ef4444" fontSize="8" fontFamily="monospace">
            ESG: NO_DATA
          </text>
        </g>
      </svg>

      <div className="absolute bottom-2 left-1/2 w-[15.5rem] -translate-x-1/2 rounded-2xl border border-[#e5e5e5] bg-white p-4 shadow-lg sm:bottom-[14%] sm:left-[4%] sm:w-72 sm:translate-x-0">
        <div className="mb-3 flex items-center gap-3">
          <span className="text-xs tracking-[0.3em] text-[#888]">SYSTEM_STATUS</span>
          <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
        </div>
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-[#f0f0f0]">
          <div className="h-full rounded-full bg-red-400" style={{ width: '15%' }} />
        </div>
        <p className="text-xs">
          <span className="text-[#888]">Visibility Index: </span>
          <span className="font-semibold text-red-500">CRITICAL</span>
        </p>
      </div>
    </div>
  );
});

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionTab, setSolutionTab] = useState(0);
  const [navSolid, setNavSolid] = useState(false);
  const [problemProgress, setProblemProgress] = useState(0);
  const [inProblemSection, setInProblemSection] = useState(false);
  const problemWrapperRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const handleScroll = () => {
      setNavSolid(window.scrollY > window.innerHeight * 0.8);

      if (!problemWrapperRef.current) {
        return;
      }

      const rect = problemWrapperRef.current.getBoundingClientRect();
      setInProblemSection(rect.top <= 0 && rect.bottom > 0);

      const progress = Math.min(1, Math.max(0, -rect.top / (2 * window.innerHeight)));
      setProblemProgress(progress);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fullText = 'Leadership teams are making AI investment decisions in the dark.';
  const beforeDark = 'Leadership teams are making AI investment decisions in the ';
  const typeProgress = Math.min(1, problemProgress / 0.4);
  const charCount = Math.floor(typeProgress * fullText.length);
  const textBeforeDark = beforeDark.slice(0, Math.min(charCount, beforeDark.length));
  const darkCharsShown = Math.max(0, charCount - beforeDark.length);
  const darkText = 'dark'.slice(0, Math.min(darkCharsShown, 4));
  const dotVisible = charCount >= fullText.length - 1;
  const overlayDark = darkCharsShown > 0;
  const overlayOpacity = problemProgress < 0.65 ? 1 : problemProgress > 0.85 ? 0 : 1 - (problemProgress - 0.65) / 0.2;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const solutionPreview = (() => {
    if (solutionTab === 0) {
      return (
        <div key="carbon-water" className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] fade-in-up">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[#dbe7df] bg-white p-6 shadow-sm sm:col-span-2">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-[#5a7768]">Carbon Footprint</p>
                  <p className="mt-2 text-sm text-[#63756a]">Enterprise AI emissions across this reporting window.</p>
                </div>
                <div className="rounded-2xl bg-[#e8f5ee] p-3 text-[#236b42]">
                  <BarChart3 className="h-6 w-6" strokeWidth={1.5} />
                </div>
              </div>
              <div className="mb-6 flex flex-wrap items-end gap-3">
                <span className="text-5xl font-medium text-[#1a1a1a]">847</span>
                <span className="pb-1 text-lg text-[#63756a]">kg CO2e</span>
                <span className="pb-1 text-sm font-medium text-[#236b42]">12% lower than last month</span>
              </div>
              <div className="flex h-28 items-end gap-2">
                {carbonTrend.map((entry, index) => (
                  <div key={index} className="flex min-w-0 flex-1 gap-1">
                    <div className="flex-1 rounded-t-sm bg-[#d4d4d4]" style={{ height: `${entry.previous}%` }} />
                    <div className="flex-1 rounded-t-sm bg-[#236b42]" style={{ height: `${entry.current}%` }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#dbe7df] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.2em] text-[#5a7768]">Water Usage</p>
                <Droplets className="h-5 w-5 text-[#236b42]" strokeWidth={1.5} />
              </div>
              <div className="mb-3">
                <span className="text-4xl font-medium text-[#1a1a1a]">12.4K</span>
                <span className="ml-2 text-sm text-[#63756a]">liters</span>
              </div>
              <p className="text-sm leading-relaxed text-[#63756a]">
                Cooling and infrastructure water intensity translated directly from workload activity.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[#dbe7df] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.2em] text-[#5a7768]">Coverage</p>
                <CheckCircle2 className="h-5 w-5 text-[#236b42]" strokeWidth={1.5} />
              </div>
              <div className="mb-3">
                <span className="text-4xl font-medium text-[#1a1a1a]">94%</span>
              </div>
              <p className="text-sm leading-relaxed text-[#63756a]">
                Provider and regional usage captured before monthly briefing generation.
              </p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[#dbe7df] bg-[#f7fbf8] p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-[#5a7768]">Provider Breakdown</p>
            <h3 className="mt-3 text-2xl font-medium tracking-tight text-[#1a1a1a]">
              See emissions and water impact by platform, not just in aggregate.
            </h3>
            <div className="mt-8 space-y-5">
              {providerBreakdown.map(provider => (
                <div key={provider.name}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="text-[#1a1a1a]">{provider.name}</span>
                    <span className="text-[#63756a]">{provider.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#dbe7df]">
                    <div className="h-full rounded-full bg-[#236b42]" style={{ width: `${provider.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-[#dbe7df] bg-white p-5">
              <p className="text-sm text-[#63756a]">
                GreenLens translates raw usage from each provider into leadership-ready carbon, water, and trend reporting.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (solutionTab === 1) {
      return (
        <div key="license" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] fade-in-up">
          <div className="rounded-[1.75rem] border border-[#dbe7df] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-[#5a7768]">License Utilization</p>
                <h3 className="mt-3 text-2xl font-medium tracking-tight text-[#1a1a1a]">
                  Surface overspend before renewals lock in waste.
                </h3>
              </div>
              <div className="rounded-2xl bg-[#e8f5ee] p-3 text-[#236b42]">
                <Zap className="h-6 w-6" strokeWidth={1.5} />
              </div>
            </div>

            <div className="mb-6 rounded-[1.5rem] bg-[#123826] p-6 text-white">
              <p className="text-sm uppercase tracking-[0.2em] text-white/60">Active Licenses</p>
              <div className="mt-4 flex items-end gap-3">
                <span className="text-5xl font-medium">67%</span>
                <span className="pb-1 text-base text-white/70">in use</span>
              </div>
              <p className="mt-3 text-sm text-white/70">33% of paid capacity is currently idle across enterprise AI seats.</p>
            </div>

            <div className="space-y-4">
              {utilizationByTeam.map(team => (
                <div key={team.team}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-[#1a1a1a]">{team.team}</span>
                    <span className="text-[#63756a]">{team.utilization}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#e5ece7]">
                    <div className="h-full rounded-full bg-[#236b42]" style={{ width: `${team.utilization}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.75rem] border border-[#dbe7df] bg-[#f7fbf8] p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.2em] text-[#5a7768]">Renewal Risk</p>
                <AlertTriangle className="h-5 w-5 text-amber-600" strokeWidth={1.5} />
              </div>
              <div className="space-y-4">
                {renewalRisks.map(risk => (
                  <div key={risk.label} className="flex items-center justify-between gap-4 rounded-2xl border border-[#dbe7df] bg-white px-4 py-3">
                    <span className="text-sm text-[#1a1a1a]">{risk.label}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        risk.tone === 'amber'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-[#e8f5ee] text-[#236b42]'
                      }`}
                    >
                      {risk.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-[#dbe7df] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.2em] text-[#5a7768]">Recommended Actions</p>
                <CheckCircle2 className="h-5 w-5 text-[#236b42]" strokeWidth={1.5} />
              </div>
              <div className="space-y-3">
                {recommendedActions.map(action => (
                  <div key={action} className="flex items-start gap-3 rounded-2xl bg-[#f7fbf8] px-4 py-3">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#236b42]" strokeWidth={1.5} />
                    <span className="text-sm text-[#1a1a1a]">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key="executive-report" className="fade-in-up">
        <div className="overflow-hidden rounded-[1.75rem] border border-[#dbe7df] bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-2 px-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#5a7768]">Executive Report</p>
              <h3 className="mt-2 text-2xl font-medium tracking-tight text-[#1a1a1a]">
                Deliver a board-ready monthly briefing from the same operating data.
              </h3>
            </div>
            <div className="text-sm text-[#63756a]">Leadership summary, footprint, utilization, and actions.</div>
          </div>
          <ExecutiveReport />
        </div>
      </div>
    );
  })();

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          navSolid ? 'border-b border-white/10 bg-[#123826]/95 backdrop-blur' : 'glass-header'
        }`}
        style={{
          opacity: inProblemSection ? 1 - overlayOpacity : 1,
          pointerEvents: inProblemSection && overlayOpacity > 0.05 ? 'none' : 'auto'
        }}
      >
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 sm:px-8 lg:px-10">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#236b42]">
                <BarChart3 className="h-5 w-5 text-white" strokeWidth={1.5} />
              </div>
              <span className="text-lg font-medium tracking-tight text-white">GreenLens AI</span>
            </Link>

            <div className="hidden items-center gap-8 md:flex">
              <a href="#problem" className="text-sm font-medium text-white/80 transition-colors hover:text-white">
                Problem
              </a>
              <a href="#solution" className="text-sm font-medium text-white/80 transition-colors hover:text-white">
                Solution
              </a>
              <a href="#product" className="text-sm font-medium text-white/80 transition-colors hover:text-white">
                Product
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-white/80 transition-colors hover:text-white">
                How it works
              </a>
            </div>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <Link href="/login" className="px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white">
              Log in
            </Link>
            <Link href="/login" className="btn-primary rounded-md px-4 py-2 text-sm font-medium">
              Get a sample report
            </Link>
          </div>

          <button
            className="p-2 text-white md:hidden"
            onClick={() => setMobileMenuOpen(open => !open)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-[#0d2217]/95 backdrop-blur md:hidden">
            <div className="container-custom flex flex-col gap-3 py-4">
              <a href="#problem" className="py-1 text-sm text-white/75 hover:text-white" onClick={closeMobileMenu}>
                Problem
              </a>
              <a href="#solution" className="py-1 text-sm text-white/75 hover:text-white" onClick={closeMobileMenu}>
                Solution
              </a>
              <a href="#product" className="py-1 text-sm text-white/75 hover:text-white" onClick={closeMobileMenu}>
                Product
              </a>
              <a href="#how-it-works" className="py-1 text-sm text-white/75 hover:text-white" onClick={closeMobileMenu}>
                How it works
              </a>
              <Link href="/login" className="py-1 text-sm text-white/75 hover:text-white" onClick={closeMobileMenu}>
                Log in
              </Link>
              <Link
                href="/login"
                className="btn-primary rounded-md px-4 py-2 text-center text-sm font-medium"
                onClick={closeMobileMenu}
              >
                Get a sample report
              </Link>
            </div>
          </div>
        )}
      </nav>

      <section className="hero-nature-bg relative overflow-hidden">
        <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col justify-center gap-12 px-6 pb-16 pt-28 sm:px-8 lg:flex-row lg:items-center lg:gap-10 lg:px-10 lg:pb-12">
          <div className="w-full text-center lg:w-[44%] lg:text-left">
            <p className="fade-in-up mb-6 text-sm uppercase tracking-[0.3em] text-white/70">AI Sustainability Intelligence</p>
            <h1 className="fade-in-up text-balance text-5xl font-medium tracking-tight text-white sm:text-6xl lg:text-[5.25rem] lg:leading-[1.02]">
              Measure the environmental cost of your enterprise AI
            </h1>

            <p className="fade-in-up animation-delay-100 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70 lg:mx-0 lg:text-xl">
              Give leadership a single system for carbon, water, license efficiency, and renewal risk across every AI provider.
            </p>

            <div className="fade-in-up animation-delay-200 mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/login"
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-md px-6 py-3 text-base font-medium sm:w-auto"
              >
                Get a sample report
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#solution"
                className="btn-secondary-dark w-full rounded-md px-6 py-3 text-center text-base font-medium sm:w-auto"
              >
                Explore the platform
              </a>
            </div>
          </div>

          <div className="fade-in-up animation-delay-300 w-full lg:flex-1 lg:pl-4">
            <div className="dashboard-shadow mx-auto w-full max-w-4xl overflow-hidden rounded-[1.5rem] border border-white/12 bg-white/95">
              <ExecutiveReport />
            </div>
          </div>
        </div>
      </section>

      <div id="problem" ref={problemWrapperRef} style={{ height: '300vh' }}>
        <section className="sticky top-0 h-screen overflow-hidden">
          <div className="absolute inset-0 flex items-center bg-white">
            <div className="mx-auto grid w-full max-w-[1400px] items-center gap-12 px-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
              <div className="text-center lg:text-left">
                <p className="mb-6 text-sm uppercase tracking-[0.3em] text-[#236b42]">The Visibility Gap</p>
                <h2 className="text-balance text-4xl font-medium tracking-tight text-[#1a1a1a] sm:text-5xl lg:text-6xl lg:leading-[1.08]">
                  Leadership teams are making AI investment decisions in the dark.
                </h2>

                <div className="mt-6 space-y-3">
                  {problemHighlights.map((highlight, index) => (
                    <span key={highlight} className="highlight-cycle mx-auto block w-fit text-2xl font-medium sm:text-3xl lg:mx-0" style={{ animationDelay: `${index * 2}s` }}>
                      {highlight}
                    </span>
                  ))}
                </div>

                <Link
                  href="/login"
                  className="mt-10 inline-flex items-center gap-2 rounded-md border border-[#236b42] px-6 py-3 text-sm font-medium text-[#236b42] transition-colors hover:bg-[#236b42] hover:text-white"
                >
                  Request a demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="flex justify-center">
                <RadarVisual />
              </div>
            </div>
          </div>

          <div
            className="absolute inset-0 z-10 flex items-center"
            style={{
              backgroundColor: overlayDark ? '#000' : '#fff',
              opacity: overlayOpacity,
              pointerEvents: overlayOpacity < 0.05 ? 'none' : 'auto',
              transition: 'background-color 200ms ease'
            }}
          >
            <div className="mx-auto w-full max-w-[1400px] px-6 sm:px-8 lg:px-10">
              <div className="max-w-4xl text-center lg:text-left">
                <p className="mb-6 invisible text-sm uppercase tracking-[0.3em]">The Visibility Gap</p>
                <h2
                  className="text-balance text-4xl font-medium tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.08]"
                  style={{ color: overlayDark ? '#fff' : '#1a1a1a' }}
                >
                  {textBeforeDark}
                  {darkCharsShown > 0 && <strong className="font-semibold text-[#facc15]">{darkText}</strong>}
                  {dotVisible && '.'}
                  {problemHighlights.map(highlight => (
                    <span key={highlight} className="highlight-cycle invisible block text-2xl sm:text-3xl">
                      {highlight}
                    </span>
                  ))}
                </h2>
                <span className="mt-10 inline-flex px-6 py-3 text-sm font-medium invisible">Request a demo</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="solution" className="flow-lines bg-white py-24 lg:py-32">
        <div className="container-custom">
          <div className="mx-auto mb-10 max-w-5xl text-center">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-[#236b42]">The Solution</p>
            <h2 className="text-balance text-4xl font-medium tracking-tight text-[#1a1a1a] sm:text-5xl lg:text-6xl">
              One platform for AI sustainability intelligence
            </h2>
            <p className="mx-auto mt-6 max-w-4xl text-lg leading-relaxed text-[#5d6a62] sm:text-xl">
              GreenLens AI connects to your existing AI systems, aggregates usage data, and delivers executive-ready insights every month.
            </p>
          </div>

          <div className="mb-8 flex justify-center">
            <div className="flex flex-wrap justify-center gap-2 rounded-full bg-[#f0f0f0] p-1">
              {solutionTabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSolutionTab(tab.id)}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                    solutionTab === tab.id ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-[#666] hover:text-[#1a1a1a]'
                  }`}
                  aria-pressed={solutionTab === tab.id}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {solutionPreview}
        </div>
      </section>

      <section id="product" className="bg-[#123826] py-24 lg:py-32">
        <div className="mx-auto grid max-w-[1400px] gap-12 px-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10">
          <div className="order-2 grid gap-4 sm:grid-cols-2 lg:order-1">
            <div className="rounded-[1.5rem] border border-white/10 bg-white p-5 shadow-sm sm:col-span-2">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-[#63756a]">Carbon Footprint</p>
                  <p className="mt-2 text-base text-[#7b8a82]">Total AI-related emissions this period</p>
                </div>
                <div className="rounded-2xl bg-[#e8f5ee] p-3 text-[#236b42]">
                  <BarChart3 className="h-6 w-6" strokeWidth={1.5} />
                </div>
              </div>
              <div className="mb-6 flex flex-wrap items-end gap-3">
                <span className="text-5xl font-medium text-[#236b42]">847</span>
                <span className="pb-1 text-lg text-[#63756a]">kg CO2e</span>
                <span className="pb-1 text-sm font-medium text-[#236b42]">12% vs last month</span>
              </div>
              <div className="flex h-20 items-end gap-1.5">
                {[40, 55, 35, 70, 60, 45, 80, 65, 50, 75, 55, 60].map((height, index) => (
                  <div key={index} className="flex-1 rounded-t-sm bg-[#236b42] opacity-75 transition-opacity hover:opacity-100" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white p-5 shadow-sm">
              <div className="mb-8 flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.2em] text-[#63756a]">Water Usage</p>
                <div className="rounded-2xl bg-[#e8f5ee] p-3 text-[#236b42]">
                  <Droplets className="h-6 w-6" strokeWidth={1.5} />
                </div>
              </div>
              <div className="mb-3">
                <span className="text-3xl font-medium text-[#236b42]">12.4K</span>
                <span className="ml-2 text-base text-[#63756a]">liters</span>
              </div>
              <p className="text-base text-[#63756a]">Data center cooling consumption from AI workloads.</p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white p-5 shadow-sm">
              <div className="mb-8 flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.2em] text-[#63756a]">License Utilization</p>
                <div className="rounded-2xl bg-[#e8f5ee] p-3 text-[#236b42]">
                  <Zap className="h-6 w-6" strokeWidth={1.5} />
                </div>
              </div>
              <div className="mb-5">
                <span className="text-3xl font-medium text-[#236b42]">67%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[#e5e5e5]">
                <div className="h-full rounded-full bg-[#236b42]" style={{ width: '67%' }} />
              </div>
              <p className="mt-4 text-base text-[#63756a]">33% capacity unused across enterprise licenses.</p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white p-5 shadow-sm">
              <div className="mb-8 flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.2em] text-[#63756a]">Renewal Risk</p>
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                  <AlertTriangle className="h-6 w-6" strokeWidth={1.5} />
                </div>
              </div>
              <div className="space-y-4">
                {renewalRisks.map(risk => (
                  <div key={risk.label} className="flex items-center justify-between gap-3">
                    <span className="text-base text-[#333]">{risk.label}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-sm ${
                        risk.tone === 'amber'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-[#e8f5ee] text-[#236b42]'
                      }`}
                    >
                      {risk.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white p-5 shadow-sm sm:col-span-2">
              <div className="mb-8 flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.2em] text-[#63756a]">Recommended Actions</p>
                <div className="rounded-2xl bg-[#e8f5ee] p-3 text-[#236b42]">
                  <CheckCircle2 className="h-6 w-6" strokeWidth={1.5} />
                </div>
              </div>
              <div className="space-y-3">
                {recommendedActions.map(action => (
                  <div key={action} className="flex items-start gap-3 rounded-2xl bg-[#f7fbf8] px-4 py-4">
                    <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-[#236b42]" strokeWidth={1.5} />
                    <span className="text-base text-[#333]">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="order-1 text-center lg:order-2 lg:pl-8 lg:text-left">
            <p className="mb-6 text-sm uppercase tracking-[0.3em] text-[#86efac]">Monthly AI Impact Briefing</p>
            <h2 className="text-balance text-4xl font-medium tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              Everything leadership needs in one report
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-white/65 sm:text-xl">
              Each month, executives receive a comprehensive briefing covering environmental impact, license efficiency, renewal exposure, and the actions worth taking next.
            </p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="grid-texture bg-white py-24 lg:py-32">
        <div className="container-custom">
          <div className="mx-auto mb-16 max-w-4xl text-center">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-[#236b42]">How It Works</p>
            <h2 className="text-balance text-4xl font-medium tracking-tight text-[#1a1a1a] sm:text-5xl lg:text-6xl">
              From connection to insight in four steps
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {workflowSteps.map(step => (
              <div
                key={step.step}
                className="flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-[1.5rem] border-2 border-[#14472c] bg-white p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-xl bg-[#e8f5ee] p-2.5 text-[#14472c]">{step.icon}</div>
                  <span className="select-none text-6xl font-bold leading-none text-[#14472c]">{step.step}</span>
                </div>
                <div>
                  <h3 className="text-xl font-medium text-[#1a1a1a]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#63756a]">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div
        className="relative overflow-hidden"
        style={{ backgroundImage: 'url(/cta-bg.jpg)', backgroundPosition: 'center', backgroundSize: 'cover' }}
      >
        <div className="absolute inset-0 bg-[#06110a]/70" />

        <section className="relative py-24 lg:py-32">
          <div className="container-custom relative z-10">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-balance text-4xl font-medium tracking-tight text-white sm:text-5xl lg:text-6xl">
                Get your first AI impact report
              </h2>
              <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-2xl">
                See exactly how GreenLens AI transforms raw AI usage data into executive-ready sustainability intelligence.
              </p>
              <div className="mt-12 flex justify-center">
                <Link
                  href="/login"
                  className="btn-primary flex w-full items-center justify-center gap-2 rounded-md px-8 py-4 text-base font-medium sm:w-auto sm:px-10 sm:py-5 sm:text-lg"
                >
                  Request a sample report
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="relative z-10 border-t border-white/10 px-6 py-10 sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#236b42]">
                <BarChart3 className="h-5 w-5 text-white" strokeWidth={1.5} />
              </div>
              <span className="text-lg font-medium tracking-tight text-white">GreenLens AI</span>
            </div>
            <p className="text-sm text-white/55">© {currentYear} GreenLens AI. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
