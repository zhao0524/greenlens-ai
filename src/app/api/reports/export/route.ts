import { NextResponse } from 'next/server'
import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer,
} from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { getPreferredReport } from '@/lib/reports/get-preferred-report'
import { generateWithGemini } from '@/lib/gemini/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ─── Colour palette ──────────────────────────────────────────────────────────

const COVER_BG    = '#1a3d2e'
const GREEN       = '#2d6a4f'
const GREEN_LIGHT = '#52b788'
const DARK        = '#152820'
const MUTED       = '#60726b'
const BG_CARD     = '#f4f8f6'
const BG_ACCENT   = '#e8f3ee'
const WHITE       = '#ffffff'
const RULE_COLOR  = '#cdddd5'

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Pages ──────────────────────────────────────────────────────────────────
  coverPage: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: COVER_BG,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: DARK,
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 48,
    lineHeight: 1.8,
  },

  // ── Cover page elements ────────────────────────────────────────────────────
  coverInner: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 56,
    paddingBottom: 60,
  },
  coverEyebrow: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: GREEN_LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 18,
  },
  coverTitle: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    lineHeight: 1.2,
    marginBottom: 10,
  },
  coverSubtitle: {
    fontSize: 16,
    fontFamily: 'Helvetica',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 48,
  },
  coverDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    marginBottom: 36,
  },
  coverMetaGrid: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 40,
  },
  coverMetaItem: {
    flex: 1,
  },
  coverMetaLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GREEN_LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  coverMetaValue: {
    fontSize: 11,
    color: WHITE,
    lineHeight: 1.4,
  },
  coverFrameworkRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 40,
  },
  coverFrameworkBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  coverFrameworkText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  coverBrandingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  coverBrandName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: GREEN_LIGHT,
  },
  coverBrandTagline: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  coverConfidential: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'right',
  },

  // ── Table of contents ──────────────────────────────────────────────────────
  tocTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 6,
  },
  tocSubtitle: {
    fontSize: 10,
    color: MUTED,
    marginBottom: 28,
  },
  tocRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e4ede8',
  },
  tocNum: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    width: 28,
  },
  tocName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    flex: 1,
  },
  tocDesc: {
    fontSize: 9,
    color: MUTED,
    flex: 2,
    marginLeft: 12,
    lineHeight: 1.5,
  },

  // ── Section headings ────────────────────────────────────────────────────────
  sectionEyebrow: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 4,
  },
  sectionLead: {
    fontSize: 11,
    color: MUTED,
    lineHeight: 1.6,
    marginBottom: 12,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: RULE_COLOR,
    marginBottom: 14,
  },
  subheading: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginTop: 14,
    marginBottom: 4,
  },

  // ── Body text ───────────────────────────────────────────────────────────────
  body: {
    fontSize: 10,
    color: DARK,
    lineHeight: 1.8,
    marginBottom: 10,
  },
  bodyMuted: {
    fontSize: 9,
    color: MUTED,
    lineHeight: 1.7,
    marginBottom: 8,
  },

  // ── Metric stat cards ────────────────────────────────────────────────────
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: BG_CARD,
    borderRadius: 5,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },
  statCardAlt: {
    flex: 1,
    backgroundColor: BG_CARD,
    borderRadius: 5,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: GREEN_LIGHT,
  },
  statLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
  },
  statValueAlt: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: GREEN_LIGHT,
  },
  statUnit: {
    fontSize: 8,
    color: MUTED,
    marginTop: 2,
  },
  statDelta: {
    fontSize: 8,
    color: GREEN,
    marginTop: 3,
  },

  // ── Item / decision / incentive cards ──────────────────────────────────────
  itemCard: {
    backgroundColor: BG_CARD,
    borderRadius: 5,
    padding: 12,
    marginBottom: 8,
  },
  itemCardAccent: {
    backgroundColor: BG_ACCENT,
    borderRadius: 5,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },
  itemTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  itemBody: {
    fontSize: 9,
    color: MUTED,
    lineHeight: 1.6,
  },
  impactBadge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    backgroundColor: BG_ACCENT,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginTop: 5,
    alignSelf: 'flex-start',
  },

  // ── Methodology callout ─────────────────────────────────────────────────────
  methodBox: {
    borderLeftWidth: 2,
    borderLeftColor: GREEN_LIGHT,
    paddingLeft: 10,
    paddingVertical: 4,
    marginBottom: 10,
    backgroundColor: BG_CARD,
    borderRadius: 3,
  },
  methodLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  methodText: {
    fontSize: 9,
    color: MUTED,
    lineHeight: 1.6,
  },

  // ── Model table ─────────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: GREEN,
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 1,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: BG_CARD,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 1,
    borderRadius: 2,
  },
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 1,
    borderRadius: 2,
  },
  tableCell: {
    fontSize: 9,
    color: DARK,
  },
  tableCellMuted: {
    fontSize: 9,
    color: MUTED,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: RULE_COLOR,
    paddingTop: 7,
  },
  footerLeft: {
    fontSize: 7,
    color: MUTED,
  },
  footerRight: {
    fontSize: 7,
    color: MUTED,
  },

  // ── Hype cycle stage pills ──────────────────────────────────────────────────
  hypePillRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  hypePill: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: BG_CARD,
  },
  hypePillActive: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: GREEN,
  },
  hypePillText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hypePillTextActive: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── ESG framework badges ────────────────────────────────────────────────────
  frameworkRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 10,
    marginTop: 4,
  },
  frameworkBadge: {
    backgroundColor: BG_ACCENT,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  frameworkText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
})

// ─── Helper utilities ────────────────────────────────────────────────────────

type Json = Record<string, unknown>

function fmt(val: number | null | undefined, decimals = 0): string {
  if (val == null) return 'N/A'
  return val.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

function fmtCurrency(val: number | null | undefined): string {
  if (val == null) return 'N/A'
  if (val >= 1_000_000) return `$${(val / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`
  if (val >= 1_000) return `$${(val / 1_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`
  return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function str(val: unknown): string {
  if (val == null) return ''
  return String(val)
}

function pct(val: number | null | undefined): string {
  if (val == null) return 'N/A'
  return `${val.toFixed(1)}%`
}

function delta(current: number | null, previous: number | null): string {
  if (current == null || previous == null || previous === 0) return ''
  const diff = ((current - previous) / previous) * 100
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${diff.toFixed(1)}% vs prior period`
}

// ─── PDF Document ────────────────────────────────────────────────────────────

function EsgPDF({
  report,
  companyName,
  geminiNarrative,
  geminiGlobal,
}: {
  report: Json
  companyName: string
  geminiNarrative: string
  geminiGlobal: string
}) {
  // ── Destructure report sections ──────────────────────────────────────────
  const esg        = ((report.esg_disclosure            as Json) ?? {}) as Json
  const exec       = ((report.executive_summary         as Json) ?? {}) as Json
  const footprint  = ((report.footprint_detail          as Json) ?? {}) as Json
  const modelEff   = ((report.model_efficiency_analysis as Json) ?? {}) as Json
  const license    = ((report.license_intelligence      as Json) ?? {}) as Json
  const incData    = ((report.incentives_and_benefits   as Json) ?? {}) as Json
  const benchData  = ((report.benchmark_data            as Json) ?? {}) as Json
  const decData    = ((report.strategic_decisions       as Json) ?? {}) as Json

  // ── Core metrics ──────────────────────────────────────────────────────────
  const carbonKg       = (report.carbon_kg              as number | null) ?? null
  const waterLiters    = (report.water_liters           as number | null) ?? null
  const effScore       = (report.model_efficiency_score as number | null) ?? null
  const utilRate       = (report.license_utilization_rate as number | null) ?? null
  const carbonPct      = (report.carbon_percentile      as number | null) ?? null
  const trendDir       = str(report.trend_direction)
  const anomaly        = (report.anomaly_detected       as boolean | null) ?? null

  const prevCarbon     = (report.prev_carbon_kg              as number | null) ?? null
  const prevWater      = (report.prev_water_liters           as number | null) ?? null
  const prevEffScore   = (report.prev_model_efficiency_score as number | null) ?? null

  // ── Executive summary ────────────────────────────────────────────────────
  const narrative      = str(exec.narrative)
  const freshness      = str((exec.data_freshness as Json)?.latest_complete_day ?? (exec.data_freshness as Json)?.coverage_end)
  const frontierPct    = (exec.frontier_model_percentage as number | null) ?? null
  const hypeCtxExec    = str(exec.hype_cycle_context)
  const mitigations    = (exec.mitigation_strategies as unknown[]) ?? []

  // ── Footprint detail ──────────────────────────────────────────────────────
  const carbonByModel  = (footprint.carbon_by_model    as unknown[]) ?? []
  const altCarbon      = (footprint.alternative_carbon_kg as number | null) ?? null
  const carbonSavings  = (footprint.carbon_savings_kg  as number | null) ?? null
  const waterSavings   = (footprint.water_savings_liters as number | null) ?? null
  const carbonMethod   = str(esg.carbon_methodology ?? footprint.carbon_methodology)
  const waterMethod    = str(esg.water_methodology  ?? footprint.water_methodology)

  // ── Model efficiency ─────────────────────────────────────────────────────
  const inventory      = (modelEff.model_inventory     as unknown[]) ?? []
  const mismatchRate   = (modelEff.mismatch_rate        as number | null) ?? null
  const mismatchedClusters = (modelEff.mismatched_clusters as unknown[]) ?? []
  const taskClustering = (modelEff.task_clustering      as Json) ?? {}

  // ── License intelligence ──────────────────────────────────────────────────
  const totalSeats     = (license.totalLicensedSeats     as number | null) ?? null
  const activeSeats    = (license.totalActiveSeats       as number | null) ?? null
  const dormantSeats   = (license.totalDormantSeats      as number | null) ?? null
  const annualCost     = (license.estimatedAnnualLicenseCost as number | null) ?? null
  const annualSavings  = (license.potentialAnnualSavings    as number | null) ?? null
  const providers      = (license.providers              as unknown[]) ?? []
  const renewalAlerts  = (license.renewalAlerts          as unknown[]) ?? []

  // ── Incentives, benchmark, decisions, ESG ────────────────────────────────
  const incentiveList  = (incData.incentives as unknown[]) ?? []
  const hypeCtxBench   = str(benchData.hype_cycle_context ?? hypeCtxExec)
  const decisionList   = (decData.decisions as unknown[]) ?? []
  const frameworks     = (esg.frameworks as string[]) ?? ['CSRD', 'GRI 305', 'IFRS S2', 'CDP']
  const esgText        = str(esg.esg_text)
  const esgCarbonMethod = str(esg.carbon_methodology ?? carbonMethod)
  const esgWaterMethod  = str(esg.water_methodology  ?? waterMethod)

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const reportingPeriod = str(report.reporting_period) || 'Current Reporting Period'

  // ── Reusable sub-components ───────────────────────────────────────────────

  const Footer = () =>
    React.createElement(View, { style: styles.footer, fixed: true },
      React.createElement(Text, { style: styles.footerLeft },
        `${companyName}  ·  AI Environmental Impact Report  ·  Confidential`
      ),
      React.createElement(
        Text,
        {
          style: styles.footerRight,
          render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
            `Page ${pageNumber} of ${totalPages}`,
        } as object
      ),
    )

  const SectionHead = ({
    num,
    title,
    lead,
  }: {
    num: string
    title: string
    lead?: string
  }) =>
    React.createElement(View, null,
      React.createElement(Text, { style: styles.sectionEyebrow }, `Section ${num}`),
      React.createElement(Text, { style: styles.sectionTitle }, title),
      lead ? React.createElement(Text, { style: styles.sectionLead }, lead) : null,
      React.createElement(View, { style: styles.divider }),
    )

  const Subheading = ({ children }: { children: string }) =>
    React.createElement(Text, { style: styles.subheading }, children)

  const BodyText = ({ children }: { children: string }) =>
    React.createElement(Text, { style: styles.body }, children)

  const MethodBox = ({ label, text }: { label: string; text: string }) =>
    text
      ? React.createElement(View, { style: styles.methodBox },
          React.createElement(Text, { style: styles.methodLabel }, label),
          React.createElement(Text, { style: styles.methodText }, text),
        )
      : null

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ════════════════════════════════════════════════════════════════════════════

  const CoverPage = () =>
    React.createElement(Page, { size: 'A4', style: styles.coverPage },
      React.createElement(View, { style: styles.coverInner },
        React.createElement(Text, { style: styles.coverEyebrow }, 'GreenLens AI  ·  Confidential Report'),
        React.createElement(Text, { style: styles.coverTitle }, companyName),
        React.createElement(Text, { style: styles.coverSubtitle }, 'AI Environmental Impact Report'),
        React.createElement(View, { style: styles.coverDivider }),
        React.createElement(View, { style: styles.coverMetaGrid },
          React.createElement(View, { style: styles.coverMetaItem },
            React.createElement(Text, { style: styles.coverMetaLabel }, 'Reporting Period'),
            React.createElement(Text, { style: styles.coverMetaValue }, reportingPeriod),
          ),
          React.createElement(View, { style: styles.coverMetaItem },
            React.createElement(Text, { style: styles.coverMetaLabel }, 'Data Through'),
            React.createElement(Text, { style: styles.coverMetaValue }, freshness || 'Current Period'),
          ),
          React.createElement(View, { style: styles.coverMetaItem },
            React.createElement(Text, { style: styles.coverMetaLabel }, 'Generated'),
            React.createElement(Text, { style: styles.coverMetaValue }, today),
          ),
          React.createElement(View, { style: styles.coverMetaItem },
            React.createElement(Text, { style: styles.coverMetaLabel }, 'Classification'),
            React.createElement(Text, { style: styles.coverMetaValue }, 'Confidential — Leadership Only'),
          ),
        ),
        React.createElement(Text, { style: { fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 10 } },
          'Framework Alignment'
        ),
        React.createElement(View, { style: styles.coverFrameworkRow },
          ...(frameworks as string[]).map((fw: string) =>
            React.createElement(View, { key: fw, style: styles.coverFrameworkBadge },
              React.createElement(Text, { style: styles.coverFrameworkText }, fw),
            )
          ),
        ),
        React.createElement(View, { style: styles.statRow },
          React.createElement(View, { style: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: 14 } },
            React.createElement(Text, { style: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GREEN_LIGHT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 } }, 'AI Carbon Footprint'),
            React.createElement(Text, { style: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: WHITE } }, carbonKg != null ? fmt(carbonKg) : '—'),
            React.createElement(Text, { style: { fontSize: 8, color: 'rgba(255,255,255,0.5)' } }, 'kg CO₂e'),
          ),
          React.createElement(View, { style: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: 14 } },
            React.createElement(Text, { style: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GREEN_LIGHT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 } }, 'AI Water Usage'),
            React.createElement(Text, { style: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: WHITE } }, waterLiters != null ? fmt(waterLiters) : '—'),
            React.createElement(Text, { style: { fontSize: 8, color: 'rgba(255,255,255,0.5)' } }, 'litres'),
          ),
          React.createElement(View, { style: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: 14 } },
            React.createElement(Text, { style: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GREEN_LIGHT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 } }, 'Model Efficiency'),
            React.createElement(Text, { style: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: WHITE } }, effScore != null ? fmt(effScore) : '—'),
            React.createElement(Text, { style: { fontSize: 8, color: 'rgba(255,255,255,0.5)' } }, '/ 100'),
          ),
          React.createElement(View, { style: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: 14 } },
            React.createElement(Text, { style: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GREEN_LIGHT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 } }, 'Licence Utilisation'),
            React.createElement(Text, { style: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: WHITE } }, utilRate != null ? `${fmt(utilRate, 1)}%` : '—'),
            React.createElement(Text, { style: { fontSize: 8, color: 'rgba(255,255,255,0.5)' } }, 'of seats active'),
          ),
        ),
        React.createElement(View, { style: styles.coverBrandingRow },
          React.createElement(View, null,
            React.createElement(Text, { style: styles.coverBrandName }, 'GreenLens AI'),
            React.createElement(Text, { style: styles.coverBrandTagline }, 'Measuring the true cost of enterprise AI'),
          ),
          React.createElement(Text, { style: styles.coverConfidential },
            `This document contains commercially sensitive information.\nDistribution is restricted to named recipients only.`
          ),
        ),
      ),
    )

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 2 — TABLE OF CONTENTS
  // ════════════════════════════════════════════════════════════════════════════

  const tocEntries = [
    { num: '01', name: 'Executive Summary', desc: 'Strategic overview of AI environmental footprint, key performance indicators, and the business case for measurement.' },
    { num: '02', name: 'AI Usage Profile', desc: 'Detailed account of AI systems measured, providers connected, model inventory, and data collection methodology.' },
    { num: '03', name: 'Model Efficiency Analysis', desc: 'Scoring framework, frontier vs efficient model utilisation, task clustering, and mismatch analysis.' },
    { num: '04', name: 'Carbon & Water Footprint', desc: 'Quantified environmental impact, period-on-period comparisons, savings potential, and scientific methodology.' },
    { num: '05', name: 'Licensing Intelligence', desc: 'Seat utilisation analysis, cost optimisation opportunities, dormant licences, and renewal planning.' },
    { num: '06', name: 'Incentives & Global Financial Benefits', desc: 'International grants, tax credits, regulatory compliance obligations, and ESG index inclusion benefits.' },
    { num: '07', name: 'Hype Cycle & Benchmark Analysis', desc: 'Gartner Hype Cycle context for GenAI, first-mover advantage positioning, and peer benchmarking.' },
    { num: '08', name: 'Strategic Decisions & Recommendations', desc: 'Prioritised action plan with business impact, mitigation strategies, and implementation roadmap.' },
    { num: '09', name: 'ESG Disclosure Statement', desc: 'Formal disclosure aligned to CSRD, GRI 305, IFRS S2, and CDP frameworks, with methodology attestations.' },
  ]

  const TocPage = () =>
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.tocTitle }, 'Table of Contents'),
      React.createElement(Text, { style: styles.tocSubtitle },
        `${companyName}  ·  AI Environmental Impact Report  ·  ${reportingPeriod}`
      ),
      ...tocEntries.map(entry =>
        React.createElement(View, { key: entry.num, style: styles.tocRow },
          React.createElement(Text, { style: styles.tocNum }, entry.num),
          React.createElement(Text, { style: styles.tocName }, entry.name),
          React.createElement(Text, { style: styles.tocDesc }, entry.desc),
        )
      ),
      React.createElement(View, { style: { marginTop: 24, backgroundColor: BG_CARD, borderRadius: 5, padding: 14 } },
        React.createElement(Text, { style: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4 } },
          'About This Report'
        ),
        React.createElement(Text, { style: styles.bodyMuted },
          `This report was generated automatically by GreenLens AI on ${today}, drawing on live usage data from connected AI provider admin APIs. All carbon and water estimates are derived from publicly available energy intensity figures for frontier AI models and third-party data centre infrastructure. No individual employee usage data, prompt content, or personally identifiable information is captured, processed, or reported at any point. This document is intended for leadership and ESG disclosure purposes and should be treated as commercially confidential.`
        ),
      ),
      React.createElement(Footer, null),
    )

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 3-4 — EXECUTIVE SUMMARY
  // ════════════════════════════════════════════════════════════════════════════

  const execNarrativeText = geminiNarrative ||
    narrative ||
    `The measurement of artificial intelligence's environmental footprint has moved from academic curiosity to board-level imperative over the course of 2024–2026. For ${companyName}, the data captured during ${reportingPeriod} represents the organisation's first objective, provider-agnostic view of its AI-driven carbon and water consumption — a baseline that will define both the trajectory of future reductions and the organisation's credibility with regulators, investors, and procurement partners.\n\nThe headline figures demand attention. AI systems consumed ${carbonKg != null ? `${fmt(carbonKg)} kg of CO₂e` : 'a measurable quantity of carbon'} and ${waterLiters != null ? `${fmt(waterLiters)} litres of water` : 'significant water resources'} during the reporting period. These are not abstract environmental statistics; they represent direct operational costs, regulatory exposure under frameworks such as the EU Corporate Sustainability Reporting Directive (CSRD) and the SEC's climate disclosure rules, and a clear signal to institutional investors who now screen AI infrastructure sustainability as part of ESG due diligence. Organisations that cannot quantify their AI footprint face an escalating disadvantage in capital markets, government procurement, and talent attraction.\n\nThe model efficiency score of ${effScore != null ? `${fmt(effScore)}/100` : 'the current period'} and licence utilisation rate of ${utilRate != null ? `${pct(utilRate)}` : 'the measured period'} together reveal the financial opportunity embedded in this data. Frontier models — those at the cutting edge of capability — carry an energy and cost premium that is only justified when the task genuinely requires them. When high-powered models are routinely deployed for low-complexity tasks, the result is a compounding inefficiency: higher costs, greater carbon output, and an inflated environmental profile at precisely the moment regulators are scrutinising such metrics most closely.`

  const globalNarrativeText = geminiGlobal ||
    `The global regulatory landscape is shifting with unusual speed. The EU's Corporate Sustainability Reporting Directive entered mandatory compliance for large undertakings in financial year 2024 and cascades to mid-market companies through 2026–2027. Under CSRD, a company's double-materiality assessment must address how its operations affect climate — and how climate-related factors affect the organisation's financial position. AI-related energy and water consumption fall squarely within this scope. The penalty regime is not symbolic: member states are required to enforce fines of up to €10 million or 2.5% of worldwide annual turnover for material non-compliance, whichever is higher. For any organisation with European operations or revenues, the cost of non-measurement now exceeds the cost of measurement by an order of magnitude.\n\nBeyond compliance, the financial incentives for demonstrable AI sustainability are substantial and growing. The United States Inflation Reduction Act provides a 30% investment tax credit for qualifying clean-technology infrastructure. The UK's HMRC R&D tax relief scheme offers SMEs up to 33 pence of relief per pound of qualifying expenditure, with AI efficiency and green-tech projects increasingly qualifying under updated HMRC guidance. Singapore's Enterprise Development Grant and Green Lane programme support sustainable technology adoption with co-funding of up to 70% of eligible project costs. Japan's ¥2 trillion Green Innovation Fund and Germany's KfW sustainability grants offer parallel opportunities for organisations with operations in those jurisdictions. The data captured by GreenLens AI is precisely the audit-trail evidence required to substantiate claims under all of these schemes.`

  const ExecSummaryPage1 = () =>
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(SectionHead, {
        num: '01',
        title: 'Executive Summary',
        lead: `Strategic overview of ${companyName}'s AI environmental footprint and the financial case for action.`,
      }),
      React.createElement(View, { style: styles.statRow },
        React.createElement(View, { style: styles.statCard },
          React.createElement(Text, { style: styles.statLabel }, 'AI Carbon'),
          React.createElement(Text, { style: styles.statValue }, carbonKg != null ? fmt(carbonKg) : '—'),
          React.createElement(Text, { style: styles.statUnit }, 'kg CO₂e'),
          prevCarbon != null && carbonKg != null
            ? React.createElement(Text, { style: styles.statDelta }, delta(carbonKg, prevCarbon))
            : null,
        ),
        React.createElement(View, { style: styles.statCard },
          React.createElement(Text, { style: styles.statLabel }, 'AI Water'),
          React.createElement(Text, { style: styles.statValue }, waterLiters != null ? fmt(waterLiters) : '—'),
          React.createElement(Text, { style: styles.statUnit }, 'litres'),
          prevWater != null && waterLiters != null
            ? React.createElement(Text, { style: styles.statDelta }, delta(waterLiters, prevWater))
            : null,
        ),
        React.createElement(View, { style: styles.statCardAlt },
          React.createElement(Text, { style: styles.statLabel }, 'Efficiency Score'),
          React.createElement(Text, { style: styles.statValueAlt }, effScore != null ? fmt(effScore) : '—'),
          React.createElement(Text, { style: styles.statUnit }, '/ 100'),
          prevEffScore != null && effScore != null
            ? React.createElement(Text, { style: { fontSize: 8, color: GREEN_LIGHT, marginTop: 3 } }, delta(effScore, prevEffScore))
            : null,
        ),
        React.createElement(View, { style: styles.statCardAlt },
          React.createElement(Text, { style: styles.statLabel }, 'Licence Util.'),
          React.createElement(Text, { style: styles.statValueAlt }, utilRate != null ? `${fmt(utilRate, 1)}%` : '—'),
          React.createElement(Text, { style: styles.statUnit }, 'of seats active'),
        ),
      ),
      ...execNarrativeText.split('\n\n').filter(Boolean).map((para: string, i: number) =>
        React.createElement(Text, { key: `exec-para-${i}`, style: styles.body }, para.trim())
      ),
      React.createElement(Footer, null),
    )

  const ExecSummaryPage2 = () =>
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Subheading, null, 'Global Regulatory Context and Financial Opportunity'),
      ...globalNarrativeText.split('\n\n').filter(Boolean).map((para: string, i: number) =>
        React.createElement(Text, { key: `global-para-${i}`, style: styles.body }, para.trim())
      ),
      React.createElement(Subheading, null, 'Key Mitigation Strategies'),
      React.createElement(Text, { style: styles.body },
        `The following mitigation strategies have been identified based on ${companyName}'s specific usage profile and model mix. Each recommendation is grounded in the measured data and calibrated to deliver the maximum combination of environmental improvement, cost reduction, and regulatory readiness within a twelve-month horizon.`
      ),
      ...(mitigations.length > 0
        ? mitigations.slice(0, 4).map((m: unknown, i: number) => {
            const mit = m as Json
            const title = str(mit.title ?? mit.strategy ?? mit.action ?? '')
            const desc  = str(mit.description ?? mit.detail ?? mit.rationale ?? (typeof m === 'string' ? m : ''))
            const text  = title && desc ? `${title}: ${desc}` : title || desc || str(m)
            return React.createElement(View, { key: `mit-${i}`, style: styles.itemCard },
              React.createElement(Text, { style: styles.itemBody }, text),
            )
          })
        : [React.createElement(View, { key: 'mit-default', style: styles.itemCard },
            React.createElement(Text, { style: styles.itemBody },
              'Prioritise task-appropriate model selection to reduce frontier model dependency for routine workflows. Implement quarterly licence audits to reclaim dormant seats before renewal. Engage with available national and international sustainability grant schemes using the data captured in this report as supporting evidence. Establish internal carbon budgets for AI workloads to drive team-level accountability.'
            ),
          )]
      ),
      React.createElement(Footer, null),
    )

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 5 — AI USAGE PROFILE
  // ════════════════════════════════════════════════════════════════════════════

  const UsageProfilePage = () =>
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(SectionHead, {
        num: '02',
        title: 'AI Usage Profile',
        lead: 'What was measured, which systems were connected, and how usage data was collected.',
      }),
      React.createElement(BodyText, null,
        `GreenLens AI measures organisational AI consumption through direct integration with provider admin APIs — the same interfaces used by IT administrators to manage seats, monitor usage volumes, and review billing. This approach captures usage at the aggregate, organisational level without accessing any individual employee's prompts, outputs, or personal data. The measurement framework covers all major frontier AI providers connected to ${companyName}'s account and normalises raw usage signals — token counts, API call volumes, model identifiers — into standardised energy and environmental metrics using peer-reviewed energy intensity coefficients.`
      ),
      React.createElement(BodyText, null,
        `Data for this report covers the period ${reportingPeriod}${freshness ? `, with the most recent complete day of data being ${freshness}` : ''}. The reporting window is aligned to ${companyName}'s operational calendar to ensure comparability with internal cost-centre reporting and to support the period-on-period benchmarking that underpins trend analysis. Where partial-period data exists — for example, where a provider integration was added mid-period — GreenLens AI applies a clearly documented proration methodology to ensure figures are representative and not artificially deflated by coverage gaps.`
      ),
      React.createElement(BodyText, null,
        `The model inventory below reflects every distinct AI model identifier detected in usage records during the reporting period. Models are classified by capability tier — Frontier (state-of-the-art reasoning and multimodal models), Efficient (optimised models with lower energy overhead), and Specialised (domain-specific or fine-tuned models) — to enable the task-to-capability alignment analysis presented in Section 03. Frontier model usage accounted for ${frontierPct != null ? `${fmt(frontierPct, 1)}%` : 'a significant proportion'} of total consumption during this period.`
      ),
      inventory.length > 0
        ? React.createElement(View, null,
            React.createElement(Subheading, null, 'Detected Model Inventory'),
            React.createElement(View, { style: styles.tableHeader },
              React.createElement(Text, { style: { ...styles.tableHeaderCell, flex: 3 } }, 'Model Identifier'),
              React.createElement(Text, { style: { ...styles.tableHeaderCell, flex: 1 } }, 'Provider'),
            ),
            ...inventory.slice(0, 10).map((m: unknown, i: number) => {
              const model = m as Json
              const modelId = str(model.model ?? model.model_id ?? model.name ?? `Model ${i + 1}`)
              const provider = str(model.provider ?? model.vendor ?? '')
              return React.createElement(View, { key: `model-${i}`, style: i % 2 === 0 ? styles.tableRow : styles.tableRowAlt },
                React.createElement(Text, { style: { ...styles.tableCell, flex: 3 } }, modelId),
                React.createElement(Text, { style: { ...styles.tableCellMuted, flex: 1 } }, provider || '—'),
              )
            }),
          )
        : React.createElement(View, { style: styles.itemCard },
            React.createElement(Text, { style: styles.itemBody },
              'Model inventory data will be populated once provider integrations are fully connected and a complete analysis cycle has been run. Connect your AI provider admin accounts via the GreenLens AI dashboard to enable this section.'
            ),
          ),
      React.createElement(Footer, null),
    )

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 6 — MODEL EFFICIENCY ANALYSIS
  // ════════════════════════════════════════════════════════════════════════════

  const ModelEfficiencyPage = () =>
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(SectionHead, {
        num: '03',
        title: 'Model Efficiency Analysis',
        lead: 'Scoring, frontier vs efficient model utilisation, task clustering, and mismatch analysis.',
      }),
      React.createElement(View, { style: styles.statRow },
        React.createElement(View, { style: styles.statCard },
          React.createElement(Text, { style: styles.statLabel }, 'Efficiency Score'),
          React.createElement(Text, { style: styles.statValue }, effScore != null ? `${fmt(effScore)}/100` : '—'),
          React.createElement(Text, { style: styles.statUnit }, 'composite score'),
        ),
        React.createElement(View, { style: styles.statCard },
          React.createElement(Text, { style: styles.statLabel }, 'Frontier Model Usage'),
          React.createElement(Text, { style: styles.statValue }, frontierPct != null ? `${fmt(frontierPct, 1)}%` : '—'),
          React.createElement(Text, { style: styles.statUnit }, 'of total volume'),
        ),
        React.createElement(View, { style: styles.statCard },
          React.createElement(Text, { style: styles.statLabel }, 'Task Mismatch Rate'),
          React.createElement(Text, { style: styles.statValue }, mismatchRate != null ? `${fmt(mismatchRate, 1)}%` : '—'),
          React.createElement(Text, { style: styles.statUnit }, 'over-specified tasks'),
        ),
      ),
      React.createElement(BodyText, null,
        `The Model Efficiency Score of ${effScore != null ? `${fmt(effScore)} out of 100` : 'the current period'} is a composite measure that weights three factors: the proportion of tasks assigned to appropriately-capable models, the degree to which token consumption is concentrated in high-energy frontier models relative to the overall task complexity profile, and the rate at which licence seats translate into active, productive usage. A score above 75 is considered strong; below 60 indicates meaningful optimisation headroom that typically translates to both cost reduction and carbon savings without any reduction in AI capability for end users.`
      ),
      React.createElement(BodyText, null,
        `Frontier AI models — those at the leading edge of capability, such as the most powerful reasoning and multimodal systems — carry a materially higher energy and financial cost per token than efficient-tier models optimised for lower-complexity tasks. When ${frontierPct != null ? `${fmt(frontierPct, 1)}%` : 'a significant share'} of usage volume flows through frontier models, the critical question is whether that capability premium is warranted. GreenLens AI's task clustering algorithm analyses patterns in usage timing, session length, and context-window utilisation to classify each cluster of activity as high-complexity (benefiting from frontier models), medium-complexity (suitable for efficient-tier), or low-complexity (appropriate for lightweight models). The mismatch rate of ${mismatchRate != null ? `${fmt(mismatchRate, 1)}%` : 'the measured period'} represents the share of usage where a frontier model was deployed for a task cluster that analysis suggests would have been served equally well by a less resource-intensive alternative.`
      ),
      React.createElement(BodyText, null,
        `The financial and environmental implications of mismatch are not trivial. Frontier models typically consume three to eight times the energy per token of their efficient-tier counterparts, and carry a corresponding cost premium. Reducing the mismatch rate by even 10 percentage points — a readily achievable target through model selection policies and user guidance — can translate to measurable carbon reductions and licence cost savings. The mismatched usage clusters identified in this analysis are documented below and should be reviewed alongside the Strategic Decisions section of this report, where specific intervention recommendations are provided.`
      ),
      mismatchedClusters.length > 0
        ? React.createElement(View, null,
            React.createElement(Subheading, null, 'Mismatched Usage Clusters'),
            ...mismatchedClusters.slice(0, 4).map((c: unknown, i: number) => {
              const cluster = c as Json
              return React.createElement(View, { key: `cluster-${i}`, style: styles.itemCard },
                React.createElement(Text, { style: styles.itemTitle },
                  str(cluster.cluster_name ?? cluster.name ?? `Cluster ${i + 1}`)
                ),
                React.createElement(Text, { style: styles.itemBody },
                  str(cluster.description ?? cluster.detail ?? cluster.summary ?? 'High-capability model deployed for routine task patterns.')
                ),
              )
            }),
          )
        : null,
      str(taskClustering) && str(taskClustering) !== '[object Object]'
        ? React.createElement(MethodBox, { label: 'Task Clustering Methodology', text: str(taskClustering) })
        : null,
      React.createElement(Footer, null),
    )

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 7 — CARBON & WATER FOOTPRINT
  // ════════════════════════════════════════════════════════════════════════════

  const FootprintPage = () =>
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(SectionHead, {
        num: '04',
        title: 'Carbon & Water Footprint',
        lead: 'Quantified environmental impact, period-on-period comparison, and savings potential.',
      }),
      React.createElement(View, { style: styles.statRow },
        React.createElement(View, { style: styles.statCard },
          React.createElement(Text, { style: styles.statLabel }, 'Total Carbon'),
          React.createElement(Text, { style: styles.statValue }, carbonKg != null ? fmt(carbonKg) : '—'),
          React.createElement(Text, { style: styles.statUnit }, 'kg CO₂e'),
          prevCarbon != null && carbonKg != null
            ? React.createElement(Text, { style: styles.statDelta }, delta(carbonKg, prevCarbon))
            : null,
        ),
        React.createElement(View, { style: styles.statCard },
          React.createElement(Text, { style: styles.statLabel }, 'Total Water'),
          React.createElement(Text, { style: styles.statValue }, waterLiters != null ? fmt(waterLiters) : '—'),
          React.createElement(Text, { style: styles.statUnit }, 'litres'),
          prevWater != null && waterLiters != null
            ? React.createElement(Text, { style: styles.statDelta }, delta(waterLiters, prevWater))
            : null,
        ),
        altCarbon != null
          ? React.createElement(View, { style: styles.statCardAlt },
              React.createElement(Text, { style: styles.statLabel }, 'Optimised Footprint'),
              React.createElement(Text, { style: styles.statValueAlt }, fmt(altCarbon)),
              React.createElement(Text, { style: styles.statUnit }, 'kg CO₂e potential'),
            )
          : null,
        carbonSavings != null
          ? React.createElement(View, { style: styles.statCardAlt },
              React.createElement(Text, { style: styles.statLabel }, 'Carbon Savings Potential'),
              React.createElement(Text, { style: styles.statValueAlt }, fmt(carbonSavings)),
              React.createElement(Text, { style: styles.statUnit }, 'kg CO₂e reachable'),
            )
          : null,
      ),
      React.createElement(BodyText, null,
        `During ${reportingPeriod}, ${companyName}'s AI systems generated a total carbon footprint of ${carbonKg != null ? `${fmt(carbonKg)} kg CO₂e` : 'a quantified amount of carbon dioxide equivalent'} and consumed ${waterLiters != null ? `${fmt(waterLiters)} litres of water` : 'a measurable quantity of water'}. These figures encompass all AI inference activity across connected provider accounts and are derived using a methodology grounded in published energy intensity data for each model class, combined with regional grid carbon intensity factors for the data centre locations associated with each provider. The methodology is documented in full in the ESG Disclosure Statement and is aligned to GRI Standard 305 for Scope 3 emissions reporting.`
      ),
      React.createElement(BodyText, null,
        `${prevCarbon != null && carbonKg != null
          ? `Compared to the prior reporting period (${fmt(prevCarbon)} kg CO₂e), carbon consumption has ${carbonKg > prevCarbon ? 'increased' : 'decreased'} by ${Math.abs(((carbonKg - prevCarbon) / prevCarbon) * 100).toFixed(1)}%. `
          : ''}${prevWater != null && waterLiters != null
          ? `Water consumption ${waterLiters > prevWater ? 'increased' : 'decreased'} by ${Math.abs(((waterLiters - prevWater) / prevWater) * 100).toFixed(1)}% versus the prior period (${fmt(prevWater)} litres). `
          : ''}These trend figures are the foundation of the year-on-year improvement trajectory that regulators, ESG rating agencies, and institutional investors expect organisations to demonstrate. A single data point is informative; a consistent downward trend is evidence of systematic management commitment.`
      ),
      carbonSavings != null || altCarbon != null
        ? React.createElement(BodyText, null,
            `The optimisation analysis embedded in this report identifies a potential carbon footprint of ${altCarbon != null ? `${fmt(altCarbon)} kg CO₂e` : 'materially lower levels'} — a reduction of ${carbonSavings != null ? `${fmt(carbonSavings)} kg CO₂e` : 'significant quantities'} achievable through task-appropriate model selection alone, without acquiring any new technology or reducing AI capability. ${waterSavings != null ? `A corresponding water saving of ${fmt(waterSavings)} litres is also achievable. ` : ''}This potential is documented as part of the science-based target-setting baseline that ${companyName} can present to the Science Based Targets initiative (SBTi) and to CDP for A-List consideration.`
          )
        : null,
      React.createElement(BodyText, null,
        `The carbon-by-model breakdown below illustrates how consumption is distributed across the model inventory. Concentration in a small number of high-emission frontier models is a common pattern and represents the primary lever available to operations teams seeking rapid, measurable reductions without disrupting end-user workflows.`
      ),
      carbonByModel.length > 0
        ? React.createElement(View, null,
            React.createElement(Subheading, null, 'Carbon by Model'),
            React.createElement(View, { style: styles.tableHeader },
              React.createElement(Text, { style: { ...styles.tableHeaderCell, flex: 2 } }, 'Model'),
              React.createElement(Text, { style: { ...styles.tableHeaderCell, flex: 1 } }, 'Carbon (kg CO₂e)'),
              React.createElement(Text, { style: { ...styles.tableHeaderCell, flex: 1 } }, 'Share'),
            ),
            ...carbonByModel.slice(0, 8).map((m: unknown, i: number) => {
              const entry = m as Json
              const modelName = str(entry.model ?? entry.model_id ?? entry.name ?? `Model ${i + 1}`)
              const carbon = (entry.carbon_kg ?? entry.carbon) as number | null
              const share = (entry.share ?? entry.percentage) as number | null
              return React.createElement(View, { key: `cbm-${i}`, style: i % 2 === 0 ? styles.tableRow : styles.tableRowAlt },
                React.createElement(Text, { style: { ...styles.tableCell, flex: 2 } }, modelName),
                React.createElement(Text, { style: { ...styles.tableCellMuted, flex: 1 } }, carbon != null ? fmt(carbon, 2) : '—'),
                React.createElement(Text, { style: { ...styles.tableCellMuted, flex: 1 } }, share != null ? `${fmt(share, 1)}%` : '—'),
              )
            }),
          )
        : null,
      esgCarbonMethod
        ? React.createElement(MethodBox, { label: 'Carbon Methodology', text: esgCarbonMethod })
        : null,
      esgWaterMethod
        ? React.createElement(MethodBox, { label: 'Water Methodology', text: esgWaterMethod })
        : null,
      React.createElement(Footer, null),
    )

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 8 — LICENSING INTELLIGENCE
  // ════════════════════════════════════════════════════════════════════════════

  const LicensingPage = () =>
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(SectionHead, {
        num: '05',
        title: 'Licensing Intelligence',
        lead: 'Seat utilisation, cost optimisation, dormant licences, and renewal planning.',
      }),
      React.createElement(View, { style: styles.statRow },
        React.createElement(View, { style: styles.statCard },
          React.createElement(Text, { style: styles.statLabel }, 'Total Licensed Seats'),
          React.createElement(Text, { style: styles.statValue }, totalSeats != null ? fmt(totalSeats) : '—'),
        ),
        React.createElement(View, { style: styles.statCard },
          React.createElement(Text, { style: styles.statLabel }, 'Active Seats'),
          React.createElement(Text, { style: styles.statValue }, activeSeats != null ? fmt(activeSeats) : '—'),
        ),
        React.createElement(View, { style: styles.statCard },
          React.createElement(Text, { style: styles.statLabel }, 'Dormant Seats'),
          React.createElement(Text, { style: styles.statValue }, dormantSeats != null ? fmt(dormantSeats) : '—'),
        ),
        React.createElement(View, { style: styles.statCardAlt },
          React.createElement(Text, { style: styles.statLabel }, 'Annual Cost'),
          React.createElement(Text, { style: styles.statValueAlt }, annualCost != null ? fmtCurrency(annualCost) : '—'),
        ),
      ),
      React.createElement(BodyText, null,
        `AI licence expenditure represents one of the fastest-growing categories of enterprise software spend. For ${companyName}, the data reveals ${totalSeats != null ? `${fmt(totalSeats)} licensed seats` : 'a significant number of licensed seats'} across connected providers, of which ${activeSeats != null ? `${fmt(activeSeats)} (${totalSeats != null && activeSeats != null ? pct((activeSeats / totalSeats) * 100) : 'the majority'})` : 'the active portion'} were used during the reporting period. The ${dormantSeats != null ? `${fmt(dormantSeats)} dormant seats` : 'dormant seats'} identified represent paid capacity generating no value — a pattern that is commonplace in enterprise AI rollouts, where initial broad licensing is followed by uneven adoption across departments.`
      ),
      React.createElement(BodyText, null,
        `The estimated annual licence cost of ${annualCost != null ? fmtCurrency(annualCost) : 'the measured total'} provides the financial baseline against which the optimisation opportunity should be assessed. Rationalising dormant seats at renewal — rather than rolling them forward — creates an immediate, annualised saving of ${annualSavings != null ? fmtCurrency(annualSavings) : 'a material amount'} at current provider pricing. This is not a one-time benefit: dormant seat rationalisation compounded with task-appropriate model selection typically yields cost reductions of 15–35% versus unmanaged AI spend, based on GreenLens AI's analysis across comparable organisations.`
      ),
      React.createElement(BodyText, null,
        `From an ESG reporting perspective, licence utilisation data serves a secondary but important function: it enables the separation of licensed capacity from actual consumption in environmental calculations. An organisation that holds 500 seats but actively uses 200 should not be attributed the full environmental footprint of 500 users. This distinction is increasingly material as carbon accounting standards evolve and as Scope 3 AI emissions begin to feature in supply chain due diligence questionnaires from major enterprise customers.`
      ),
      providers.length > 0
        ? React.createElement(View, null,
            React.createElement(Subheading, null, 'Provider Breakdown'),
            React.createElement(View, { style: styles.tableHeader },
              React.createElement(Text, { style: { ...styles.tableHeaderCell, flex: 2 } }, 'Provider'),
              React.createElement(Text, { style: { ...styles.tableHeaderCell, flex: 1 } }, 'Seats'),
              React.createElement(Text, { style: { ...styles.tableHeaderCell, flex: 1 } }, 'Active'),
              React.createElement(Text, { style: { ...styles.tableHeaderCell, flex: 1 } }, 'Util. %'),
              React.createElement(Text, { style: { ...styles.tableHeaderCell, flex: 1.5 } }, 'Annual Cost'),
              React.createElement(Text, { style: { ...styles.tableHeaderCell, flex: 1.5 } }, 'Savings Potential'),
            ),
            ...providers.slice(0, 8).map((p: unknown, i: number) => {
              const prov = p as Json
              const pName = str(prov.provider ?? prov.name ?? `Provider ${i + 1}`)
              const seats = (prov.totalSeats ?? prov.total_seats) as number | null
              const active = (prov.activeSeats ?? prov.active_seats) as number | null
              const utilR = (prov.utilizationRate ?? prov.utilization_rate) as number | null
              const cost = (prov.estimatedAnnualCost ?? prov.estimated_annual_cost) as number | null
              const savings = (prov.potentialSavingsAtRenewal ?? prov.potential_savings) as number | null
              return React.createElement(View, { key: `prov-${i}`, style: i % 2 === 0 ? styles.tableRow : styles.tableRowAlt },
                React.createElement(Text, { style: { ...styles.tableCell, flex: 2 } }, pName),
                React.createElement(Text, { style: { ...styles.tableCellMuted, flex: 1 } }, seats != null ? fmt(seats) : '—'),
                React.createElement(Text, { style: { ...styles.tableCellMuted, flex: 1 } }, active != null ? fmt(active) : '—'),
                React.createElement(Text, { style: { ...styles.tableCellMuted, flex: 1 } }, utilR != null ? `${fmt(utilR, 1)}%` : '—'),
                React.createElement(Text, { style: { ...styles.tableCellMuted, flex: 1.5 } }, cost != null ? fmtCurrency(cost) : '—'),
                React.createElement(Text, { style: { ...styles.tableCellMuted, flex: 1.5 } }, savings != null ? fmtCurrency(savings) : '—'),
              )
            }),
          )
        : null,
      renewalAlerts.length > 0
        ? React.createElement(View, null,
            React.createElement(Subheading, null, 'Upcoming Renewal Alerts'),
            ...renewalAlerts.slice(0, 4).map((a: unknown, i: number) => {
              const alert = a as Json
              return React.createElement(View, { key: `alert-${i}`, style: styles.itemCardAccent },
                React.createElement(Text, { style: styles.itemTitle },
                  `${str(alert.provider)}  ·  Renewal in ${str(alert.monthsToRenewal)} months (${str(alert.renewalDate)})`
                ),
                React.createElement(Text, { style: styles.itemBody }, str(alert.actionRequired)),
              )
            }),
          )
        : null,
      React.createElement(Footer, null),
    )

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 9 — INCENTIVES & GLOBAL FINANCIAL BENEFITS
  // ════════════════════════════════════════════════════════════════════════════

  const defaultIncentives = [
    { name: 'EU CSRD — Mandatory Compliance', jurisdiction: 'European Union', description: 'The Corporate Sustainability Reporting Directive is mandatory for all large undertakings (>250 employees or €40M revenue) from FY2024, cascading to mid-market from FY2025. Double materiality assessment required. Non-compliance penalties: up to €10M or 2.5% of worldwide annual turnover (whichever is higher) per member state enforcement.', value: 'Penalty avoidance up to €10M / 2.5% turnover' },
    { name: 'EU AI Act — Environmental Provisions', jurisdiction: 'European Union', description: 'High-risk AI systems must document and disclose environmental performance data including energy consumption and carbon impact. GreenLens AI measurement data constitutes the required technical documentation.', value: 'Compliance evidence for regulatory clearance' },
    { name: 'US Inflation Reduction Act (IRA) — Investment Tax Credit', jurisdiction: 'United States', description: '30% investment tax credit (ITC) available for qualifying clean technology infrastructure, including energy-efficient computing and AI infrastructure upgrades. Requires documented baseline and improvement metrics — precisely what GreenLens AI provides.', value: '30% ITC on qualifying capital expenditure' },
    { name: 'UK HMRC R&D Tax Relief', jurisdiction: 'United Kingdom', description: 'SMEs can claim up to 33p relief per £1 of qualifying R&D expenditure. AI efficiency and sustainable technology projects increasingly qualify under updated HMRC guidance. Large companies can claim 20% RDEC. FCA ESG disclosure requirements apply to financial services firms with immediate effect.', value: 'Up to 33% relief for SMEs; 20% RDEC for large companies' },
    { name: 'Singapore MAS ESG Framework & Enterprise Development Grant', jurisdiction: 'Singapore', description: "MAS ESG disclosure framework requires financial institutions to disclose material sustainability risks. Enterprise Development Grant (EDG) co-funds up to 70% of eligible sustainability and technology adoption costs. Singapore's Green Lane programme provides expedited approval for sustainable technology deployments.", value: 'Up to 70% co-funding via EDG' },
    { name: 'Japan Green Innovation Fund & METI GX Strategy', jurisdiction: 'Japan', description: "Japan's ¥2 trillion (approx. $14B) Green Innovation Fund supports organisations demonstrating measurable sustainability progress as part of METI's GX (Green Transformation) strategy. Carbon-neutral 2050 commitment creates mandatory disclosure pathway for all major listed entities from 2025.", value: 'Grant access via METI GX programme' },
    { name: 'France Crédit d\'Impôt Recherche (CIR)', jurisdiction: 'France', description: '30% tax credit on qualifying R&D expenditure, rising to 50% for the first €100M in eligible spend for new claimants. AI efficiency optimisation and sustainability measurement qualify as eligible R&D activities under updated MESRI guidance.', value: '30–50% tax credit on eligible R&D' },
    { name: 'Germany KfW Green Innovation Grants', jurisdiction: 'Germany', description: 'KfW Bank programmes provide low-interest financing and grants for sustainable technology investment. AI efficiency projects with documented environmental improvement plans are eligible for Energieeffizienz Programm funding, typically covering 25–50% of project costs.', value: '25–50% of eligible project costs' },
    { name: 'Canada Clean Technology Investment Tax Credit', jurisdiction: 'Canada', description: '30% refundable investment tax credit for qualifying clean technology property, including energy-efficient computing infrastructure. Organisations must demonstrate a sustainability improvement plan, which GreenLens AI reporting directly supports.', value: '30% refundable ITC' },
    { name: 'Australia ASIC Climate Risk & CEFC Financing', jurisdiction: 'Australia', description: 'ASIC requires climate risk disclosure for all listed entities and large proprietary companies. The Clean Energy Finance Corporation (CEFC) provides concessional financing for sustainable technology investment, prioritising projects with documented environmental baselines.', value: 'Concessional financing up to 100% of eligible costs' },
  ]

  const allIncentives = incentiveList.length > 0 ? incentiveList : defaultIncentives

  const IncentivesPage = () =>
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(SectionHead, {
        num: '06',
        title: 'Incentives & Global Financial Benefits',
        lead: 'International grants, tax credits, compliance obligations, and ESG index inclusion benefits.',
      }),
      React.createElement(BodyText, null,
        `The financial case for AI environmental measurement extends well beyond cost avoidance. Across every major economic bloc, governments have constructed a framework of financial incentives designed to accelerate corporate sustainability action — incentives that require precisely the kind of objective, auditable baseline data that GreenLens AI produces. At the same time, the penalty architecture for non-compliance has grown materially: the EU's CSRD regime now imposes fines of up to €10 million or 2.5% of worldwide annual turnover for material reporting failures, whichever is higher. For any organisation with European operations or customer relationships, the cost-benefit calculation has fundamentally shifted.`
      ),
      React.createElement(BodyText, null,
        `Beyond direct grants and tax credits, ESG index inclusion creates a structural financial benefit that compounds over time. Membership of the FTSE4Good Index, MSCI ESG Leaders, or the Dow Jones Sustainability Index (DJSI) demonstrably reduces the cost of capital: sustainability-linked loans from major lenders now offer interest rate step-downs of 25–100 basis points for borrowers who meet documented ESG improvement targets, and institutional investors managing an estimated $120 trillion in assets under management screen ESG credentials as a precondition of investment. The data captured by GreenLens AI is the currency of this market.`
      ),
      React.createElement(BodyText, null,
        `Procurement represents an underappreciated dimension of the incentive landscape. The EU Sustainable Finance Action Plan requires large public contracting authorities and corporates subject to CSRD to cascade sustainability criteria into their supply chains. Organisations that cannot demonstrate documented AI environmental credentials risk exclusion from procurement processes for enterprise clients operating under these obligations — a market access risk that translates directly to revenue exposure. Conversely, organisations with verified sustainability data can differentiate on ESG credentials in competitive tender situations, an advantage that is quantifiable and durable.`
      ),
      ...allIncentives.slice(0, 10).map((item: unknown, i: number) => {
        const inc = item as Json
        const name = str(inc.name ?? inc.title ?? inc.incentive) || `Incentive ${i + 1}`
        const desc = str(inc.description ?? inc.detail ?? inc.summary)
        const value = str(inc.value ?? inc.amount ?? inc.benefit ?? inc.estimated_value)
        const jurisdiction = str(inc.jurisdiction ?? inc.region ?? inc.country)
        return React.createElement(View, { key: `inc-${i}`, style: styles.itemCard },
          React.createElement(View, { style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 } },
            React.createElement(Text, { style: { ...styles.itemTitle, flex: 1 } }, name),
            jurisdiction
              ? React.createElement(View, { style: { ...styles.frameworkBadge, marginLeft: 8 } },
                  React.createElement(Text, { style: styles.frameworkText }, jurisdiction),
                )
              : null,
          ),
          React.createElement(Text, { style: styles.itemBody }, desc),
          value
            ? React.createElement(Text, { style: styles.impactBadge }, `Value: ${value}`)
            : null,
        )
      }),
      React.createElement(Footer, null),
    )

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 10 — HYPE CYCLE & BENCHMARK ANALYSIS
  // ════════════════════════════════════════════════════════════════════════════

  const HypeCyclePage = () =>
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(SectionHead, {
        num: '07',
        title: 'Hype Cycle & Benchmark Analysis',
        lead: 'Gartner positioning, first-mover advantage, and peer benchmarking for AI environmental data.',
      }),
      React.createElement(Text, { style: { ...styles.bodyMuted, marginBottom: 6 } }, 'Current GenAI / LLM Hype Cycle Position'),
      React.createElement(View, { style: styles.hypePillRow },
        ...[
          { label: 'Technology Trigger', active: false },
          { label: 'Peak of Inflated Expectations', active: false },
          { label: 'Trough of Disillusionment ◀ NOW', active: true },
          { label: 'Slope of Enlightenment', active: false },
          { label: 'Plateau of Productivity', active: false },
        ].map(stage =>
          React.createElement(View, { key: stage.label, style: stage.active ? styles.hypePillActive : styles.hypePill },
            React.createElement(Text, { style: stage.active ? styles.hypePillTextActive : styles.hypePillText }, stage.label),
          )
        ),
      ),
      React.createElement(BodyText, null,
        `The Gartner Hype Cycle is one of the most useful frameworks available for understanding where a technology sits in the cycle of market expectations versus demonstrated value. The five stages — Technology Trigger, Peak of Inflated Expectations, Trough of Disillusionment, Slope of Enlightenment, and Plateau of Productivity — describe a consistent pattern that has characterised every major technology wave from the internet to cloud computing to mobile. Understanding which stage applies to generative AI today is not an academic exercise: it directly determines the strategic value of the data ${companyName} is now collecting.`
      ),
      React.createElement(BodyText, null,
        `Generative AI and large language models followed the classic pattern with unusual speed. The Technology Trigger arrived with the release of GPT-3 in 2020; the Peak of Inflated Expectations — characterised by exponential media coverage, stratospheric valuations, and sweeping productivity promises — was reached by late 2022 and maintained through 2023. By 2024–2026, the market has moved firmly into the Trough of Disillusionment. This phase is characterised not by failure, but by recalibration: enterprises are scrutinising AI ROI with the same rigour they apply to any major capital investment. Cost scrutiny is intensifying — hyperscaler AI infrastructure costs, licence expenditure, and the energy overhead of inference workloads are all under the microscope. Productivity claims that were accepted on faith in 2022 now require evidence.`
      ),
      React.createElement(BodyText, null,
        `The Trough of Disillusionment is not a signal to retreat from AI investment — it is precisely the moment when the discipline of measurement becomes a competitive differentiator. Organisations that begin collecting objective, provider-agnostic environmental and efficiency data during the Trough will arrive at the Slope of Enlightenment (estimated 2026–2028) with a multi-year baseline that enables genuinely evidence-based optimisation decisions. They will be able to demonstrate consistent improvement trajectories to regulators and investors, substantiate ROI calculations with actual cost and carbon data, and position AI investment within a credible sustainability narrative. Organisations that wait until the Slope is visible to begin measurement will face the same disadvantage as those who deferred cloud cost optimisation until hyperscaler bills had already compounded.`
      ),
      React.createElement(BodyText, null,
        `${companyName}'s current benchmark position — carbon efficiency at the ${carbonPct != null ? `${fmt(carbonPct)}th percentile` : 'measured percentile'} relative to peer organisations, with a ${trendDir || 'current'} trend direction${anomaly === true ? ' and a statistical anomaly detected in usage patterns that warrants investigation' : ''} — provides the objective foundation for this positioning strategy. ${hypeCtxBench ? hypeCtxBench : 'First-mover advantage in AI environmental data is time-limited: as CSRD compliance requirements cascade through the mid-market, the window in which this data constitutes a differentiator rather than a baseline expectation will close. The organisations that establish measurement discipline now will define the benchmark that others are measured against.'}`
      ),
      React.createElement(BodyText, null,
        `This data enables four specific strategic capabilities that will become increasingly valuable on the Slope of Enlightenment: accurate, auditable ROI calculation for AI investment (separating value-generating from wasteful spend); regulatory compliance readiness for CSRD, IFRS S2, SEC climate rules, and their successors; evidence-based model optimisation that reduces environmental impact without reducing capability; and a documented sustainability narrative for institutional investors, enterprise procurement teams, and talent markets that increasingly screen on ESG credentials. Each of these capabilities compounds in value as the market moves toward the Plateau of Productivity.`
      ),
      React.createElement(Footer, null),
    )

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 11 — STRATEGIC DECISIONS & RECOMMENDATIONS
  // ════════════════════════════════════════════════════════════════════════════

  const defaultDecisions = [
    { title: 'Implement Task-Appropriate Model Selection Policy', description: 'Establish internal guidelines that classify AI tasks by complexity and prescribe the appropriate model tier. Frontier models should be reserved for tasks requiring advanced reasoning, complex code generation, or multimodal capabilities. Routine summarisation, classification, and drafting tasks should default to efficient-tier models.', impact: 'Estimated 20–40% reduction in AI energy consumption and licence cost without capability reduction.' },
    { title: 'Launch Quarterly AI Licence Audit Programme', description: 'Establish a quarterly review process to identify dormant seats across all connected providers ahead of renewal windows. Coordinate with HR to align licence counts with active headcount and validated use cases.', impact: 'Reclaim an estimated annual saving at next renewal cycle based on current dormancy data.' },
    { title: 'Register for Applicable International Incentive Programmes', description: 'Using the GreenLens AI report as supporting documentation, submit applications to all applicable national grant and tax credit schemes identified in Section 06. Prioritise jurisdictions where deadlines fall within the next financial quarter.', impact: 'Material grant and tax credit value across identified eligible programmes.' },
    { title: 'Establish Internal AI Carbon Budget', description: 'Translate the carbon footprint baseline established in this report into a per-team or per-cost-centre carbon allocation. Communicate the budget alongside financial expenditure data to drive team-level accountability and embed environmental considerations into AI procurement decisions.', impact: 'Structural behavioural change that sustains improvement beyond initial optimisation interventions.' },
    { title: 'Prepare CSRD Double-Materiality Assessment', description: 'Engage finance and legal teams to integrate GreenLens AI data into the CSRD double-materiality assessment process. The environmental impact of AI operations and the financial risk of regulatory non-compliance are both material under the CSRD framework and must be addressed in the sustainability statement.', impact: 'Compliance readiness ahead of mandatory reporting deadline; penalty risk mitigation.' },
  ]

  const allDecisions = decisionList.length > 0 ? decisionList : defaultDecisions

  const StrategicDecisionsPage = () =>
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(SectionHead, {
        num: '08',
        title: 'Strategic Decisions & Recommendations',
        lead: 'Prioritised action plan with business impact, mitigation strategies, and implementation guidance.',
      }),
      React.createElement(BodyText, null,
        `The following strategic recommendations are derived directly from ${companyName}'s measured data and are calibrated to deliver the maximum combined benefit across three dimensions: financial return (cost reduction, grant capture, regulatory penalty avoidance), environmental improvement (carbon and water reduction), and strategic positioning (regulatory readiness, ESG index eligibility, procurement differentiation). Each recommendation has been assessed for feasibility within a twelve-month implementation horizon and does not require additional technology procurement beyond the GreenLens AI platform.`
      ),
      React.createElement(BodyText, null,
        `The recommendations are presented in priority order, weighted by the magnitude of financial impact and the urgency of any associated compliance deadlines. Leadership teams are advised to assign executive ownership to each recommendation and to establish a measurement cadence — GreenLens AI's quarterly reporting cycle is designed to provide the ongoing data required to track implementation progress and demonstrate year-on-year improvement to external stakeholders.`
      ),
      ...allDecisions.slice(0, 6).map((item: unknown, i: number) => {
        const d = item as Json
        const title  = str(d.title ?? d.decision ?? d.action) || `Recommendation ${i + 1}`
        const detail = str(d.description ?? d.rationale ?? d.detail ?? d.summary)
        const impact = str(d.impact ?? d.expectedImpact ?? d.expected_impact)
        return React.createElement(View, { key: `dec-${i}`, style: styles.itemCardAccent },
          React.createElement(Text, { style: styles.itemSubtitle }, `Recommendation ${String(i + 1).padStart(2, '0')}`),
          React.createElement(Text, { style: styles.itemTitle }, title),
          React.createElement(Text, { style: styles.itemBody }, detail),
          impact
            ? React.createElement(Text, { style: styles.impactBadge }, `Expected Impact: ${impact}`)
            : null,
        )
      }),
      React.createElement(Footer, null),
    )

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 12 — ESG DISCLOSURE STATEMENT
  // ════════════════════════════════════════════════════════════════════════════

  const defaultEsgText = `${companyName} is committed to the transparent and accurate disclosure of its artificial intelligence environmental impacts in accordance with internationally recognised sustainability reporting frameworks. The data presented in this report has been collected by GreenLens AI using automated integration with provider administrative APIs and represents a complete account of organisational AI consumption across all connected accounts during the reporting period ${reportingPeriod}.

Carbon dioxide equivalent (CO₂e) emissions attributable to AI operations have been calculated using published energy intensity coefficients for each model class, combined with regional grid carbon intensity factors aligned to IPCC AR6 recommendations. Water consumption estimates are derived from the water usage effectiveness (WUE) metrics published by the relevant data centre operators, adjusted for the regional mix of infrastructure used by each AI provider.

All figures in this report represent Scope 3 indirect emissions associated with purchased AI services, classified under GHG Protocol Category 1 (Purchased goods and services). No Scope 1 or Scope 2 emissions are attributed. The methodology is aligned to GRI Standard 305-3 (Other indirect (Scope 3) GHG emissions), IFRS S2 Climate-related Disclosures, and the CDP Climate Change Questionnaire.

This disclosure has been prepared in accordance with the EU Corporate Sustainability Reporting Directive (CSRD) double materiality assessment requirements. Both the environmental impact of AI operations (impact materiality) and the financial risks and opportunities associated with AI-related climate factors (financial materiality) have been assessed and determined to be material for the purposes of this report.

Limitations: Estimates are subject to the completeness of provider API data and the accuracy of published energy intensity coefficients, which may be updated as more granular infrastructure data becomes available. GreenLens AI operates a continuous improvement programme for its measurement methodology and will update coefficients as new peer-reviewed data is published.

Data Privacy: No individual employee usage data, prompt content, conversation history, or personally identifiable information is captured, stored, or reported by GreenLens AI at any point in the measurement process. All metrics represent aggregate organisational consumption derived from provider-level usage records.`

  const EsgDisclosurePage = () =>
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(SectionHead, {
        num: '09',
        title: 'ESG Disclosure Statement',
        lead: 'Formal disclosure aligned to CSRD, GRI 305, IFRS S2, and CDP frameworks.',
      }),
      React.createElement(Text, { style: { ...styles.bodyMuted, marginBottom: 8 } }, 'Framework Alignment'),
      React.createElement(View, { style: styles.frameworkRow },
        ...(frameworks as string[]).map((fw: string) =>
          React.createElement(View, { key: `fw-${fw}`, style: styles.frameworkBadge },
            React.createElement(Text, { style: styles.frameworkText }, fw),
          )
        ),
      ),
      ...(esgText || defaultEsgText).split('\n\n').filter(Boolean).map((para: string, i: number) =>
        React.createElement(Text, { key: `esg-${i}`, style: styles.body }, para.trim())
      ),
      esgCarbonMethod
        ? React.createElement(MethodBox, { label: 'Carbon Calculation Methodology', text: esgCarbonMethod })
        : null,
      esgWaterMethod
        ? React.createElement(MethodBox, { label: 'Water Calculation Methodology', text: esgWaterMethod })
        : null,
      React.createElement(View, { style: { marginTop: 16, backgroundColor: BG_CARD, borderRadius: 5, padding: 14 } },
        React.createElement(Text, { style: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 6 } },
          'Prepared By'
        ),
        React.createElement(Text, { style: styles.bodyMuted },
          `This report was prepared by GreenLens AI on behalf of ${companyName}. GreenLens AI is an independent AI environmental measurement platform. The data, calculations, and methodology in this report reflect GreenLens AI's best estimates based on available provider data and published scientific literature as at the report generation date. This report does not constitute independent third-party assurance; organisations seeking assured ESG disclosures should engage an accredited assurance provider.`
        ),
        React.createElement(Text, { style: { fontSize: 8, color: MUTED, marginTop: 8 } },
          `Report generated: ${today}  ·  Reporting period: ${reportingPeriod}  ·  Generated by GreenLens AI  ·  greenlens.ai`
        ),
      ),
      React.createElement(Footer, null),
    )

  // ════════════════════════════════════════════════════════════════════════════
  // ASSEMBLE DOCUMENT
  // ════════════════════════════════════════════════════════════════════════════

  return React.createElement(Document,
    { title: `${companyName} AI ESG Report`, author: 'GreenLens AI' },
    React.createElement(CoverPage, null),
    React.createElement(TocPage, null),
    React.createElement(ExecSummaryPage1, null),
    React.createElement(ExecSummaryPage2, null),
    React.createElement(UsageProfilePage, null),
    React.createElement(ModelEfficiencyPage, null),
    React.createElement(FootprintPage, null),
    React.createElement(LicensingPage, null),
    React.createElement(IncentivesPage, null),
    React.createElement(HypeCyclePage, null),
    React.createElement(StrategicDecisionsPage, null),
    React.createElement(EsgDisclosurePage, null),
  )
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedReportId = searchParams.get('reportId') ?? null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('supabase_user_id', user.id)
      .single()
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    const report = await getPreferredReport(supabase, company.id, requestedReportId)
    if (!report) {
      return NextResponse.json(
        { error: 'No report found. Run an analysis first.' },
        { status: 404 }
      )
    }

    const companyName: string = company.name ?? 'Your Organisation'
    const carbonKg: number | null    = (report.carbon_kg as number | null) ?? null
    const waterLiters: number | null = (report.water_liters as number | null) ?? null
    const effScore: number | null    = (report.model_efficiency_score as number | null) ?? null
    const utilRate: number | null    = (report.license_utilization_rate as number | null) ?? null
    const period: string             = String(report.reporting_period ?? 'current period')

    // ── Try Gemini for richer narratives ────────────────────────────────────
    let geminiNarrative = ''
    let geminiGlobal    = ''

    const execSummaryPrompt = `You are a professional ESG consultant writing a corporate sustainability report executive summary. Write exactly 3 well-structured paragraphs (no headers, no bullet points, continuous prose) for the executive summary of an AI environmental impact report.

Company: ${companyName}
Reporting Period: ${period}
AI Carbon Footprint: ${carbonKg != null ? `${carbonKg.toLocaleString()} kg CO2e` : 'measured quantity'}
AI Water Consumption: ${waterLiters != null ? `${waterLiters.toLocaleString()} litres` : 'measured quantity'}
Model Efficiency Score: ${effScore != null ? `${effScore}/100` : 'measured score'}
Licence Utilisation Rate: ${utilRate != null ? `${utilRate.toFixed(1)}%` : 'measured rate'}

Write in authoritative corporate language suitable for a board-level audience. Address: (1) the significance of having this objective measurement baseline in today's regulatory environment, (2) what the specific numbers reveal about the organisation's current AI footprint and optimisation opportunity, (3) the financial and strategic value of acting on this data now. Do not use bullet points. Write in flowing paragraphs only. Do not include any markdown formatting.`

    const globalNarrativePrompt = `Write exactly 2 authoritative paragraphs (continuous prose, no headers, no bullets) for a professional ESG report section explaining the global regulatory incentive landscape for AI environmental measurement.

Company: ${companyName}

Cover in paragraph 1: The EU CSRD mandatory compliance obligations (penalties up to €10M or 2.5% of worldwide turnover), EU AI Act environmental provisions, EU Taxonomy Regulation, and what "double materiality" means financially for any business with European operations.

Cover in paragraph 2: The financial incentive programmes available including US IRA 30% investment tax credit, UK HMRC R&D tax relief up to 33% for SMEs, Singapore EDG co-funding up to 70%, Japan's ¥2 trillion Green Innovation Fund, France CIR 30% R&D tax credit, Germany KfW grants, and sustainability-linked loans with ESG-related interest rate step-downs.

Write in authoritative corporate language. No markdown. No bullet points. Flowing paragraphs only.`

    try {
      geminiNarrative = await generateWithGemini(execSummaryPrompt)
    } catch (geminiErr) {
      console.warn('[/api/reports/export] Gemini narrative failed, using template:', geminiErr instanceof Error ? geminiErr.message : String(geminiErr))
    }

    try {
      geminiGlobal = await generateWithGemini(globalNarrativePrompt)
    } catch (geminiErr) {
      console.warn('[/api/reports/export] Gemini global narrative failed, using template:', geminiErr instanceof Error ? geminiErr.message : String(geminiErr))
    }

    // ── Render PDF ────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      React.createElement(EsgPDF, {
        report: report as Record<string, unknown>,
        companyName,
        geminiNarrative,
        geminiGlobal,
      }) as unknown as any
    )

    const companySlug = companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const dateSlug    = new Date().toISOString().slice(0, 10)
    const filename    = `${companySlug}-ai-esg-report-${dateSlug}.pdf`

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/reports/export] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
