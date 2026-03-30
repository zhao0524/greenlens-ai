'use client';

import { useState, useEffect, useRef, memo } from 'react';
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

const RadarVisual = memo(function RadarVisual() {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex justify-center">
        <svg viewBox="0 0 300 300" className="w-200 h-200">
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

          {[36, 72, 108, 144].map(r => (
            <circle key={r} cx="150" cy="150" r={r} fill="none" stroke="#236b42" strokeOpacity="0.15" strokeWidth="0.5" />
          ))}
          <circle cx="150" cy="150" r="145" fill="none" stroke="#236b42" strokeOpacity="0.25" strokeWidth="1" />

          <g>
            <animateTransform attributeName="transform" type="rotate" from="0 150 150" to="360 150 150" dur="8s" repeatCount="indefinite" />
            <path d="M150,150 L150,6 A144,144 0 0,1 274.6,78 Z" fill="url(#sweepGradient)" />
            <line x1="150" y1="150" x2="150" y2="6" stroke="#86efac" strokeOpacity="0.2" strokeWidth="1" />
          </g>

          <g>
            <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.13;0.14;0.49;1" dur="8s" repeatCount="indefinite" />
            <circle cx="208" cy="98" r="4" fill="#ef4444" />
            <text x="202" y="90" fill="#ef4444" fontSize="8" fontFamily="monospace" textAnchor="end">DATA_ERROR: NULL</text>
          </g>

          <g>
            <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.636;0.646;0.986;1" dur="8s" repeatCount="indefinite" />
            <circle cx="92" cy="198" r="3" fill="#60a5fa" />
            <text x="98" y="194" fill="#60a5fa" fontSize="8" fontFamily="monospace" textAnchor="start">WATER_INDEX: NA</text>
          </g>

          <g>
            <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.362;0.372;0.722;1" dur="8s" repeatCount="indefinite" />
            <circle cx="215" cy="205" r="4" fill="#f59e0b" />
            <text x="209" y="216" fill="#f59e0b" fontSize="8" fontFamily="monospace" textAnchor="end">CARBON: UNKNOWN</text>
          </g>

          <g>
            <animate attributeName="opacity" values="0.45;0;0;1;0.45" keyTimes="0;0.22;0.864;0.874;1" dur="8s" repeatCount="indefinite" />
            <circle cx="75" cy="85" r="3" fill="#ef4444" />
            <text x="81" y="82" fill="#ef4444" fontSize="8" fontFamily="monospace">ESG: NO_DATA</text>
          </g>
        </svg>

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
  );
});

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionTab, setSolutionTab] = useState(0);
  const [navSolid, setNavSolid] = useState(false);
  const problemWrapperRef = useRef<HTMLDivElement>(null);
  const [problemProgress, setProblemProgress] = useState(0);
  const [inProblemSection, setInProblemSection] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setNavSolid(window.scrollY > window.innerHeight * 0.8);

      if (problemWrapperRef.current) {
        const rect = problemWrapperRef.current.getBoundingClientRect();
        setInProblemSection(rect.top <= 0 && rect.bottom > 0);
        const progress = Math.min(1, Math.max(0, -rect.top / (2 * window.innerHeight)));
        setProblemProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fullText = "Leadership teams are making AI investment decisions in the dark."
  const beforeDark = "Leadership teams are making AI investment decisions in the "

  // Typewriter completes by progress 0.4, dark screen dwells 0.4→0.65, fades 0.65→0.85
  const typeProgress = Math.min(1, problemProgress / 0.4)
  const charCount = Math.floor(typeProgress * fullText.length)

  const textBeforeDark = beforeDark.slice(0, Math.min(charCount, beforeDark.length))
  const darkCharsShown = Math.max(0, charCount - beforeDark.length)
  const darkText = "dark".slice(0, Math.min(darkCharsShown, 4))
  const dotVisible = charCount >= fullText.length - 1
  const overlayDark = darkCharsShown > 0

  const overlayOpacity = problemProgress < 0.65
    ? 1
    : problemProgress > 0.85
      ? 0
      : 1 - (problemProgress - 0.65) / 0.2;

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          navSolid ? 'bg-[#14472c] border-b border-[#1a2e23]' : 'bg-transparent border-b border-transparent'
        }`}
        style={{ opacity: inProblemSection ? 1 - overlayOpacity : 1, pointerEvents: inProblemSection && overlayOpacity > 0.05 ? 'none' : 'auto', transition: 'opacity 80ms linear' }}
      >
        <div className="flex items-center justify-between h-16 px-6 lg:px-10">
          {/* Logo + Nav */}
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-[#236b42] flex items-center justify-center">
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
          <div className="md:hidden bg-black/60 border-t border-white/10 backdrop-blur-md">
            <div className="container-custom py-4 flex flex-col gap-3">
              <a href="#problem" className="text-sm text-white/75 hover:text-white py-1">Problem</a>
              <a href="#solution" className="text-sm text-white/75 hover:text-white py-1">Solution</a>
              <a href="#product" className="text-sm text-white/75 hover:text-white py-1">Product</a>
              <a href="#how-it-works" className="text-sm text-white/75 hover:text-white py-1">How it works</a>
              <Link href="/login" className="text-sm text-white/75 hover:text-white py-1">
                Login
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
        <div className="flex flex-col lg:flex-row items-center gap-8 w-full pt-16 lg:pt-0">
          {/* Left: Text */}
          <div className="w-full lg:w-[48%] px-6 sm:px-10 lg:pl-28 lg:pr-0 shrink-0">
            <h1 className="text-5xl sm:text-6xl lg:text-[5.75rem] font-medium tracking-tight leading-[1.1] mb-10 fade-in-up text-white">
              Measure the environmental cost<br />of your enterprise AI
            </h1>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-center lg:justify-start gap-2 sm:gap-3">
              <Link
                href="/login"
                className="btn-primary text-sm px-4 py-2 rounded-md font-medium w-full sm:w-auto flex items-center justify-center gap-1.5"
              >
                Get a sample report
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <a
                href="#how-it-works"
                className="btn-secondary-dark text-sm px-4 py-2 rounded-md font-medium w-full sm:w-auto text-center"
              >
                See how it works
              </a>
            </div>
          </div>

          {/* Right: Dashboard mockup — flush to right edge */}
          <div className="w-full lg:flex-1 fade-in-up animation-delay-200 flex justify-center items-center px-6 sm:pr-12 lg:pl-0 lg:pr-12">
            <div className="dashboard-shadow rounded-tl-lg rounded-tr-lg overflow-hidden border-t border-l border-r border-white/10 w-full">
              <ExecutiveReport />
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section — pinned scroll wrapper */}
      <div id="problem" ref={problemWrapperRef} style={{ height: '300vh' }}>
        <section style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

          {/* Phase 2: actual content (bottom layer) */}
          <div className="bg-white" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
            <div className="grid lg:grid-cols-2 gap-0 items-center w-full">

              {/* Left: Text */}
              <div className="px-6 sm:px-10 lg:px-20">
                <p className="text-[#236b42] text-lg font-medium tracking-widest uppercase mb-6">
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
                  className="inline-flex items-center gap-2 border border-[#236b42] text-[#236b42] hover:bg-[#236b42] hover:text-white transition-colors px-6 py-3 rounded-md text-sm font-medium"
                >
                  Request a demo <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Right: Radar visual */}
              <RadarVisual />

            </div>
          </div>

          {/* Phase 1: typewriter overlay (top layer, fades out on scroll) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: overlayDark ? '#000' : '#fff',
              opacity: overlayOpacity,
              pointerEvents: overlayOpacity < 0.05 ? 'none' : 'auto',
              transition: 'background-color 200ms ease',
              display: 'flex',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <div className="grid lg:grid-cols-2 gap-0 items-center w-full">
              <div className="px-6 sm:px-10 lg:px-20">
                <p className="text-lg font-medium tracking-widest uppercase mb-6 invisible">
                  The Visibility Gap
                </p>
                <h2
                  className="text-5xl sm:text-6xl font-medium tracking-tight leading-[1.15] mb-10"
                  style={{ color: overlayDark ? '#fff' : '#1a1a1a' }}
                >
                  {textBeforeDark}
                  {darkCharsShown > 0 && (
                    <strong style={{ color: '#FFD700', fontWeight: 700 }}>{darkText}</strong>
                  )}
                  {dotVisible && '.'}
                  <span className="highlight-cycle mt-4 invisible">No carbon data.</span>
                  <span className="highlight-cycle invisible">No water metrics.</span>
                  <span className="highlight-cycle invisible">No license utilization insights.</span>
                </h2>
                <span className="inline-flex px-6 py-3 text-sm font-medium invisible">
                  Request a demo
                </span>
              </div>
            </div>
          </div>

        </section>
      </div>



      {/* Solution Section */}
      <section id="solution" className="py-24 lg:py-32 bg-white flow-lines">
        <div className="container-custom">
          {/* Centered text */}
          <div className="text-center max-w-6xl mx-auto mb-10">
            <p className="text-[#236b42] text-sm font-medium tracking-wide uppercase mb-4">
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
            <div className="flex flex-wrap justify-center gap-1 bg-[#f0f0f0] rounded-2xl p-1">
              {[
                { id: 0, label: 'Carbon & Water' },
                { id: 1, label: 'License Utilization' },
                { id: 2, label: 'Executive Report' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSolutionTab(tab.id)}
                  className={`px-3 sm:px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
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



      {/* Product Walkthrough Section */}
      <section id="product" className="py-24 lg:py-32 bg-[#14472c]">
          <div className="grid lg:grid-cols-[3fr_2fr] gap-10 items-center px-6 lg:px-0">

            {/* Left: Bento Grid */}
            <div className="md:pl-12 lg:pl-16 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Carbon Footprint - Large */}
            <div className="bg-white border border-[#e5e5e5] p-5 rounded-xl col-span-1 sm:col-span-2 card-hover">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[#666] text-sm uppercase tracking-wide mb-1">Carbon Footprint</p>
                  <p className="text-base text-[#888]">Total AI-related emissions this period</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#e8f5ee] flex items-center justify-center text-[#236b42]">
                  <BarChart3 className="w-6 h-6" strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex items-end gap-4 mb-6">
                <span className="text-5xl font-medium number-highlight">847</span>
                <span className="text-[#666] text-lg mb-1">kg CO₂e</span>
                <span className="text-[#236b42] text-sm mb-2 flex items-center gap-1">
                  ↓ 12% vs last month
                </span>
              </div>
              <div className="h-20 flex items-end gap-1.5">
                {[40, 55, 35, 70, 60, 45, 80, 65, 50, 75, 55, 60].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-[#236b42] rounded-t-sm opacity-70 hover:opacity-100 transition-opacity"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Water Usage */}
            <div className="bg-white border border-[#e5e5e5] p-5 rounded-xl card-hover">
              <div className="flex items-center justify-between mb-8">
                <p className="text-[#666] text-sm uppercase tracking-wide">Water Usage</p>
                <div className="w-12 h-12 rounded-xl bg-[#e8f5ee] flex items-center justify-center text-[#236b42]">
                  <Droplets className="w-6 h-6" strokeWidth={1.5} />
                </div>
              </div>
              <div className="mb-3">
                <span className="text-3xl font-medium number-highlight">12.4K</span>
                <span className="text-[#666] text-base ml-2">liters</span>
              </div>
              <p className="text-[#666] text-base">Data center cooling consumption from AI workloads</p>
            </div>

            {/* License Utilization */}
            <div className="bg-white border border-[#e5e5e5] p-5 rounded-xl card-hover">
              <div className="flex items-center justify-between mb-8">
                <p className="text-[#666] text-sm uppercase tracking-wide">License Utilization</p>
                <div className="w-12 h-12 rounded-xl bg-[#e8f5ee] flex items-center justify-center text-[#236b42]">
                  <Zap className="w-6 h-6" strokeWidth={1.5} />
                </div>
              </div>
              <div className="mb-5">
                <span className="text-3xl font-medium number-highlight">67%</span>
              </div>
              <div className="w-full h-3 bg-[#e5e5e5] rounded-full overflow-hidden">
                <div className="h-full bg-[#236b42] rounded-full" style={{ width: '67%' }} />
              </div>
              <p className="text-[#666] text-base mt-4">33% capacity unused across enterprise licenses</p>
            </div>

            {/* Renewal Risk */}
            <div className="bg-white border border-[#e5e5e5] p-5 rounded-xl card-hover">
              <div className="flex items-center justify-between mb-8">
                <p className="text-[#666] text-sm uppercase tracking-wide">Renewal Risk</p>
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <AlertTriangle className="w-6 h-6" strokeWidth={1.5} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-base text-[#333]">Azure OpenAI</span>
                  <span className="text-sm px-3 py-1 bg-amber-50 text-amber-600 rounded">47 days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base text-[#333]">Microsoft 365 Copilot</span>
                  <span className="text-sm px-3 py-1 bg-[#e8f5ee] text-[#236b42] rounded">124 days</span>
                </div>
              </div>
            </div>

            {/* Recommended Actions */}
            <div className="bg-white border border-[#e5e5e5] p-5 rounded-xl card-hover">
              <div className="flex items-center justify-between mb-8">
                <p className="text-[#666] text-sm uppercase tracking-wide">Recommended Actions</p>
                <div className="w-12 h-12 rounded-xl bg-[#e8f5ee] flex items-center justify-center text-[#236b42]">
                  <CheckCircle2 className="w-6 h-6" strokeWidth={1.5} />
                </div>
              </div>
              <div className="space-y-3">
                {[
                  'Consolidate Azure regions to reduce carbon by 18%',
                  'Right-size Copilot licenses for Finance team',
                  'Migrate batch jobs to off-peak hours'
                ].map((action, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-[#fafafa] rounded-lg">
                    <ChevronRight className="w-5 h-5 text-[#236b42] mt-0.5 shrink-0" strokeWidth={1.5} />
                    <span className="text-base text-[#333]">{action}</span>
                  </div>
                ))}
              </div>
            </div>
            </div>

            {/* Right: Text */}
            <div className="pr-6 md:pr-12 lg:pr-16">
              <p className="text-[#86efac] text-sm font-medium tracking-wide uppercase mb-6">
                Monthly AI Impact Briefing
              </p>
              <h2 className="text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tight mb-8 text-white leading-[1.1]">
                Everything leadership needs in one report
              </h2>
              <p className="text-white/60 text-xl leading-relaxed">
                Each month, executives receive a comprehensive briefing covering environmental impact, license efficiency, and specific recommendations.
              </p>
            </div>

          </div>
      </section>



      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 lg:py-32 bg-white grid-texture">
        <div className="container-custom">
          <div className="text-center w-full mb-16">
            <p className="text-[#236b42] text-sm font-medium tracking-wide uppercase mb-4">
              How It Works
            </p>
            <h2 className="text-5xl sm:text-6xl font-medium tracking-tight text-[#1a1a1a]">
              From connection to insight in four steps
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '1',
                icon: <Link2 className="w-5 h-5" strokeWidth={1.5} />,
                title: 'Connect providers',
                description: 'Link your AI infrastructure—OpenAI, Azure, Microsoft 365, and more.'
              },
              {
                step: '2',
                icon: <Database className="w-5 h-5" strokeWidth={1.5} />,
                title: 'Aggregate data',
                description: 'We pull usage metrics automatically from all connected services.'
              },
              {
                step: '3',
                icon: <Calculator className="w-5 h-5" strokeWidth={1.5} />,
                title: 'Run calculations',
                description: 'Carbon, water, and efficiency metrics computed using verified models.'
              },
              {
                step: '4',
                icon: <FileText className="w-5 h-5" strokeWidth={1.5} />,
                title: 'Generate briefing',
                description: 'Monthly executive report delivered with insights and recommendations.'
              }
            ].map((item, index) => (
              <div
                key={index}
                className="relative rounded-2xl p-6 flex flex-col justify-between aspect-auto sm:aspect-square overflow-hidden"
                style={{ background: '#fff', border: '2px solid #14472c' }}
              >
                {/* Top row: icon left, large number right */}
                <div className="flex items-start justify-between overflow-hidden">
                  <div className="w-9 h-9 rounded-lg bg-[#e8f5ee] flex items-center justify-center text-[#14472c] shrink-0">
                    {item.icon}
                  </div>
                  <span
                    className="font-bold select-none"
                    style={{ fontSize: '4.5rem', color: '#14472c', lineHeight: 1 }}
                  >
                    {item.step}
                  </span>
                </div>

                {/* Bottom: title + description */}
                <div>
                  <h3 className="text-lg font-medium text-[#1a1a1a] mb-1.5">{item.title}</h3>
                  <p className="text-[#666] text-sm leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* Final CTA + Footer share the same background image */}
      <div className="relative" style={{ backgroundImage: 'url(/cta-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-black/55 pointer-events-none" />

      {/* Final CTA Section */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="container-custom relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight mb-8 text-white">
              Get your first AI impact report
            </h2>
            <p className="text-white/70 text-2xl mb-12 max-w-2xl mx-auto">
              See exactly how GreenLens AI transforms AI usage data into executive-ready sustainability intelligence.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="btn-primary text-lg px-10 py-5 rounded-md font-medium w-full sm:w-auto flex items-center justify-center gap-2"
              >
                Request a sample report
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 relative z-10 px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-[#236b42] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-medium text-lg tracking-tight text-white">GreenLens AI</span>
          </div>
          <p className="text-sm text-white/50">
            © 2025 GreenLens AI. All rights reserved.
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
}
