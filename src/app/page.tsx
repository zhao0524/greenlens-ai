'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Droplets,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Link2,
  Database,
  Calculator,
  FileText,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import ExecutiveReport from '@/components/landing/ExecutiveReport';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionTab, setSolutionTab] = useState(0);
  const [navSolid, setNavSolid] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setNavSolid(window.scrollY > window.innerHeight * 0.8);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navSolid ? 'bg-[#243d30] border-b border-[#1a2e23]' : 'glass-header'}`}>
        <div className="flex items-center justify-between h-16 px-6 lg:px-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-[#4C7060] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-medium text-lg tracking-tight text-white">GreenLens AI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#problem" className="text-sm font-semibold text-white hover:text-white/80 transition-colors">Problem</a>
            <a href="#solution" className="text-sm font-semibold text-white hover:text-white/80 transition-colors">Solution</a>
            <a href="#product" className="text-sm font-semibold text-white hover:text-white/80 transition-colors">Product</a>
            <a href="#how-it-works" className="text-sm font-semibold text-white hover:text-white/80 transition-colors">How it works</a>
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-white hover:text-white/80 transition-colors px-3 py-2">
              Log in
            </Link>
            <Link href="/login" className="btn-primary text-sm px-4 py-2 rounded-md font-medium">
              Get a sample report
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-black/60 border-t border-white/10">
            <div className="container-custom py-4 flex flex-col gap-3">
              <Link href="/login" className="text-sm text-white/75 hover:text-white py-1">
                Log in
              </Link>
              <Link href="/login" className="btn-primary text-sm px-4 py-2 rounded-md font-medium text-center">
                Get a sample report
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative hero-nature-bg overflow-hidden min-h-screen flex flex-col justify-center">
        <div className="flex items-center gap-8 w-full">
          {/* Left: Text */}
          <div className="pl-20 lg:pl-28 shrink-0 w-[48%]">
            <h1 className="text-5xl sm:text-6xl lg:text-[5.75rem] font-medium tracking-tight leading-[1.1] mb-10 fade-in-up text-white">
              Measure the environmental cost<br />of your enterprise AI
            </h1>

            <div className="flex flex-col sm:flex-row items-start gap-4 fade-in-up animation-delay-100">
              <Link
                href="/login"
                className="btn-primary text-base px-6 py-3 rounded-md font-medium w-full sm:w-auto flex items-center justify-center gap-2"
              >
                Get a sample report
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="btn-secondary-dark text-base px-6 py-3 rounded-md font-medium w-full sm:w-auto text-center"
              >
                See how it works
              </a>
            </div>
          </div>

          {/* Right: Dashboard mockup — flush to right edge */}
          <div className="flex-1 fade-in-up animation-delay-200 flex justify-center items-center pl-0 pr-12">
            <div className="dashboard-shadow rounded-tl-lg rounded-tr-lg overflow-hidden border-t border-l border-r border-white/10 w-full">
              <ExecutiveReport />
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="py-24 lg:py-32 bg-[#fafafa]">
        <div className="grid lg:grid-cols-2 gap-0 items-center w-full">

            {/* Left: Text */}
            <div className="px-10 lg:px-20">
              <p className="text-[#4C7060] text-lg font-medium tracking-widest uppercase mb-6">
                The Visibility Gap
              </p>
              <h2 className="text-5xl sm:text-6xl font-medium tracking-tight mb-10 text-[#1a1a1a] leading-[1.15]">
                Leadership teams are making AI investment decisions in the dark.
                <span className="highlight-cycle mt-4" style={{ animationDelay: '0s' }}>No carbon data.</span>
                <span className="highlight-cycle" style={{ animationDelay: '2s' }}>No water metrics.</span>
                <span className="highlight-cycle" style={{ animationDelay: '4s' }}>No license utilization insights.</span>
              </h2>

              <Link
                href="/login"
                className="inline-flex items-center gap-2 border border-[#4C7060] text-[#4C7060] hover:bg-[#4C7060] hover:text-white transition-colors px-6 py-3 rounded-md text-sm font-medium"
              >
                Request a demo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: Radar visual */}
            <div className="flex flex-col gap-4">
              {/* Radar screen + status card overlay */}
              <div className="relative flex justify-center">
                <svg viewBox="0 0 300 300" className="w-200 h-200">
                  <defs>
                    <linearGradient id="sweepGradient" x1="150" y1="150" x2="274" y2="78" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#86efac" stopOpacity="0" />
                      <stop offset="70%" stopColor="#86efac" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#86efac" stopOpacity="0.45" />
                    </linearGradient>
                  </defs>

                  {/* Crosshair lines */}
                  <line x1="5" y1="150" x2="295" y2="150" stroke="#4C7060" strokeOpacity="0.15" strokeWidth="0.5" />
                  <line x1="150" y1="5" x2="150" y2="295" stroke="#4C7060" strokeOpacity="0.15" strokeWidth="0.5" />
                  <line x1="47" y1="47" x2="253" y2="253" stroke="#4C7060" strokeOpacity="0.08" strokeWidth="0.5" />
                  <line x1="253" y1="47" x2="47" y2="253" stroke="#4C7060" strokeOpacity="0.08" strokeWidth="0.5" />

                  {/* Concentric rings */}
                  {[36, 72, 108, 144].map(r => (
                    <circle key={r} cx="150" cy="150" r={r} fill="none" stroke="#4C7060" strokeOpacity="0.15" strokeWidth="0.5" />
                  ))}
                  <circle cx="150" cy="150" r="145" fill="none" stroke="#4C7060" strokeOpacity="0.25" strokeWidth="1" />

                  {/* Rotating sweep */}
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

                  {/* Blip 1 — appears at ~48° into sweep */}
                  <g>
                    <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.13;0.14;0.49;1" dur="8s" repeatCount="indefinite" />
                    <circle cx="208" cy="98" r="4" fill="#ef4444" />
                    <text x="202" y="90" fill="#ef4444" fontSize="8" fontFamily="monospace" textAnchor="end">DATA_ERROR: NULL</text>
                  </g>

                  {/* Blip 2 — appears at ~230° into sweep */}
                  <g>
                    <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.636;0.646;0.986;1" dur="8s" repeatCount="indefinite" />
                    <circle cx="92" cy="198" r="3" fill="#60a5fa" />
                    <text x="98" y="194" fill="#60a5fa" fontSize="8" fontFamily="monospace" textAnchor="start">WATER_INDEX: NA</text>
                  </g>

                  {/* Blip 3 — appears at ~130° into sweep */}
                  <g>
                    <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.362;0.372;0.722;1" dur="8s" repeatCount="indefinite" />
                    <circle cx="215" cy="205" r="4" fill="#f59e0b" />
                    <text x="209" y="216" fill="#f59e0b" fontSize="8" fontFamily="monospace" textAnchor="end">CARBON: UNKNOWN</text>
                  </g>

                  {/* Blip 4 — appears at ~311° into sweep, wraps fade into next cycle */}
                  <g>
                    <animate attributeName="opacity" values="0.45;0;0;1;0.45" keyTimes="0;0.22;0.864;0.874;1" dur="8s" repeatCount="indefinite" />
                    <circle cx="75" cy="85" r="3" fill="#ef4444" />
                    <text x="81" y="82" fill="#ef4444" fontSize="8" fontFamily="monospace">ESG: NO_DATA</text>
                  </g>
                </svg>

                {/* Status card — anchored to bottom-left of radar */}
                <div className="absolute bottom-[14%] left-[2%] bg-white border border-[#e5e5e5] rounded-lg p-6 card-hover w-80">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[#888] text-xs font-mono tracking-widest">SYSTEM_STATUS</span>
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  </div>
                  <div className="w-full h-1 bg-[#f0f0f0] rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: '15%' }} />
                  </div>
                  <p className="text-xs font-mono">
                    <span className="text-[#888]">Visibility Index: </span>
                    <span className="text-red-500 font-semibold">CRITICAL</span>
                  </p>
                </div>
              </div>
            </div>

        </div>
      </section>

      <div className="section-divider" />

      {/* Solution Section */}
      <section id="solution" className="py-24 lg:py-32 bg-white flow-lines">
        <div className="container-custom">
          {/* Centered text */}
          <div className="text-center max-w-6xl mx-auto mb-10">
            <p className="text-[#4C7060] text-sm font-medium tracking-wide uppercase mb-4">
              The Solution
            </p>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tight mb-6 text-[#1a1a1a]">
              One platform for AI sustainability intelligence
            </h2>
            <p className="text-[#555] text-2xl">
              GreenLens AI connects to your existing AI systems, aggregates usage data, and delivers executive-ready insights every month.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-6">
            <div className="flex gap-1 bg-[#f0f0f0] rounded-full p-1">
              {[
                { id: 0, label: 'Carbon & Water' },
                { id: 1, label: 'License Utilization' },
                { id: 2, label: 'Executive Report' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSolutionTab(tab.id)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    solutionTab === tab.id
                      ? 'bg-white text-[#1a1a1a] shadow-sm'
                      : 'text-[#666] hover:text-[#1a1a1a]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Media placeholder */}
          <div className="w-full rounded-2xl bg-[#e5e5e5] aspect-[16/9] flex items-center justify-center border border-[#d4d4d4]">
            <span className="text-[#aaa] text-sm font-medium tracking-wide">
              {['Carbon & Water dashboard', 'License Utilization dashboard', 'Executive Report'][solutionTab]}
            </span>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Product Walkthrough Section */}
      <section id="product" className="py-24 lg:py-32 bg-[#fafafa]">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-[#4C7060] text-sm font-medium tracking-wide uppercase mb-4">
              Monthly AI Impact Briefing
            </p>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight mb-6 text-[#1a1a1a]">
              Everything leadership needs in one report
            </h2>
            <p className="text-[#555] text-lg">
              Each month, executives receive a comprehensive briefing covering environmental impact, license efficiency, and specific recommendations.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Carbon Footprint - Large */}
            <div className="bg-white border border-[#e5e5e5] p-6 rounded-lg md:col-span-2 card-hover">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[#666] text-xs uppercase tracking-wide mb-1">Carbon Footprint</p>
                  <p className="text-sm text-[#888]">Total AI-related emissions this period</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#f0f5f3] flex items-center justify-center text-[#4C7060]">
                  <BarChart3 className="w-5 h-5" strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex items-end gap-4 mb-4">
                <span className="text-5xl font-medium number-highlight">847</span>
                <span className="text-[#666] text-lg mb-1">kg CO₂e</span>
                <span className="text-[#4C7060] text-sm mb-1.5 flex items-center gap-1">
                  ↓ 12% vs last month
                </span>
              </div>
              <div className="h-24 flex items-end gap-1">
                {[40, 55, 35, 70, 60, 45, 80, 65, 50, 75, 55, 60].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-[#4C7060] rounded-t-sm opacity-70 hover:opacity-100 transition-opacity"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Water Usage */}
            <div className="bg-white border border-[#e5e5e5] p-6 rounded-lg card-hover">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[#666] text-xs uppercase tracking-wide">Water Usage</p>
                <div className="w-10 h-10 rounded-lg bg-[#f0f5f3] flex items-center justify-center text-[#4C7060]">
                  <Droplets className="w-5 h-5" strokeWidth={1.5} />
                </div>
              </div>
              <div className="mb-2">
                <span className="text-4xl font-medium number-highlight">12.4K</span>
                <span className="text-[#666] text-sm ml-2">liters</span>
              </div>
              <p className="text-[#666] text-sm">Data center cooling consumption from AI workloads</p>
            </div>

            {/* License Utilization */}
            <div className="bg-white border border-[#e5e5e5] p-6 rounded-lg card-hover">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[#666] text-xs uppercase tracking-wide">License Utilization</p>
                <div className="w-10 h-10 rounded-lg bg-[#f0f5f3] flex items-center justify-center text-[#4C7060]">
                  <Zap className="w-5 h-5" strokeWidth={1.5} />
                </div>
              </div>
              <div className="mb-4">
                <span className="text-4xl font-medium number-highlight">67%</span>
              </div>
              <div className="w-full h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
                <div className="h-full bg-[#4C7060] rounded-full" style={{ width: '67%' }} />
              </div>
              <p className="text-[#666] text-sm mt-3">33% capacity unused across enterprise licenses</p>
            </div>

            {/* Renewal Risk */}
            <div className="bg-white border border-[#e5e5e5] p-6 rounded-lg card-hover">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[#666] text-xs uppercase tracking-wide">Renewal Risk</p>
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <AlertTriangle className="w-5 h-5" strokeWidth={1.5} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#333]">Azure OpenAI</span>
                  <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded">47 days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#333]">Microsoft 365 Copilot</span>
                  <span className="text-xs px-2 py-0.5 bg-[#f0f5f3] text-[#4C7060] rounded">124 days</span>
                </div>
              </div>
            </div>

            {/* Recommended Actions */}
            <div className="bg-white border border-[#e5e5e5] p-6 rounded-lg md:col-span-3 lg:col-span-1 card-hover">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[#666] text-xs uppercase tracking-wide">Recommended Actions</p>
                <div className="w-10 h-10 rounded-lg bg-[#f0f5f3] flex items-center justify-center text-[#4C7060]">
                  <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} />
                </div>
              </div>
              <div className="space-y-3">
                {[
                  'Consolidate Azure regions to reduce carbon by 18%',
                  'Right-size Copilot licenses for Finance team',
                  'Migrate batch jobs to off-peak hours'
                ].map((action, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-[#fafafa] rounded-lg">
                    <ChevronRight className="w-4 h-4 text-[#4C7060] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                    <span className="text-sm text-[#333]">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 lg:py-32 bg-white grid-texture">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-[#4C7060] text-sm font-medium tracking-wide uppercase mb-4">
              How It Works
            </p>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight mb-6 text-[#1a1a1a]">
              From connection to insight in four steps
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                icon: <Link2 className="w-6 h-6" strokeWidth={1.5} />,
                title: 'Connect providers',
                description: 'Link your AI infrastructure—OpenAI, Azure, Microsoft 365, and more.'
              },
              {
                step: '02',
                icon: <Database className="w-6 h-6" strokeWidth={1.5} />,
                title: 'Aggregate data',
                description: 'We pull usage metrics automatically from all connected services.'
              },
              {
                step: '03',
                icon: <Calculator className="w-6 h-6" strokeWidth={1.5} />,
                title: 'Run calculations',
                description: 'Carbon, water, and efficiency metrics computed using verified models.'
              },
              {
                step: '04',
                icon: <FileText className="w-6 h-6" strokeWidth={1.5} />,
                title: 'Generate briefing',
                description: 'Monthly executive report delivered with insights and recommendations.'
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-white border border-[#e5e5e5] p-6 rounded-lg h-full card-hover">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[#4C7060] text-sm font-medium">{item.step}</span>
                    <div className="w-12 h-12 rounded-lg bg-[#f0f5f3] flex items-center justify-center text-[#4C7060]">
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-[#1a1a1a]">{item.title}</h3>
                  <p className="text-[#666] text-sm leading-relaxed">{item.description}</p>
                </div>
                {/* Connector line */}
                {index < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-[1px] bg-[#e5e5e5]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Differentiation Section */}
      <section className="py-24 lg:py-32 bg-[#fafafa]">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-[#4C7060] text-sm font-medium tracking-wide uppercase mb-4">
              Why GreenLens AI
            </p>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight mb-6 text-[#1a1a1a]">
              Built for leadership, not engineers
            </h2>
            <p className="text-[#555] text-lg">
              Unlike dev tools and infrastructure monitors, GreenLens AI is designed for executives who need to make decisions—not debug systems.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                title: 'Leadership-first design',
                description: 'Every metric, chart, and recommendation is crafted for CIOs, CFOs, and sustainability teams—not technical operators.'
              },
              {
                title: 'ESG and governance focus',
                description: 'Purpose-built for sustainability reporting, board presentations, and regulatory compliance.'
              },
              {
                title: 'Works with your stack',
                description: 'Native integrations with OpenAI, Azure, Microsoft 365, and other enterprise AI tools you already use.'
              },
              {
                title: 'From data to decisions',
                description: 'Turns raw usage metrics into clear recommendations leadership can act on immediately.'
              }
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white border border-[#e5e5e5] p-8 rounded-lg card-hover"
              >
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-[#4C7060] mt-2 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-medium mb-2 text-[#1a1a1a]">{item.title}</h3>
                    <p className="text-[#666] text-sm leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Final CTA Section */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight mb-6 text-[#1a1a1a]">
              Get your first AI impact report
            </h2>
            <p className="text-[#555] text-lg mb-10 max-w-xl mx-auto">
              See exactly how GreenLens AI transforms AI usage data into executive-ready sustainability intelligence.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="btn-primary text-base px-8 py-4 rounded-md font-medium w-full sm:w-auto flex items-center justify-center gap-2"
              >
                Request a sample report
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-[#888] text-sm mt-6">
              No commitment required. See a real executive briefing.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] py-12 bg-[#fafafa]">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-[#4C7060] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <span className="font-medium text-lg tracking-tight text-[#1a1a1a]">GreenLens AI</span>
            </div>
            <div className="flex items-center gap-8">
              <a href="#" className="text-sm text-[#666] hover:text-[#1a1a1a] transition-colors">Privacy</a>
              <a href="#" className="text-sm text-[#666] hover:text-[#1a1a1a] transition-colors">Terms</a>
              <a href="#" className="text-sm text-[#666] hover:text-[#1a1a1a] transition-colors">Contact</a>
            </div>
            <p className="text-sm text-[#888]">
              © 2025 GreenLens AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
