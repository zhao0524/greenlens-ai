import test from 'node:test'
import assert from 'node:assert/strict'

import { buildReportPayload } from '../src/lib/agents/synthesis'
import {
  buildAvailableSection,
  buildReportAvailability,
  buildUnavailableSection,
} from '../src/lib/analysis/provider-status'

interface ReportPayloadUnderTest {
  report_mode: 'full' | 'partial'
  section_availability: {
    usage: { status: 'available' | 'unavailable' }
    license: { status: 'available' | 'unavailable' }
  }
  carbon_kg: number | null
  water_liters: number | null
  model_efficiency_score: number | null
  license_utilization_rate: number | null
  prev_carbon_kg: number | null
  executive_summary: {
    section_availability: {
      usage: { status: 'available' | 'unavailable' }
    }
  }
  footprint_detail: {
    unavailable_reason: string | null
  }
  benchmark_data: {
    unavailable_reason: string | null
  }
  license_intelligence?: {
    estimatedAnnualLicenseCost: number | null
    potentialAnnualSavings: number | null
    providers: Array<{
      estimatedAnnualCost: number | null
      potentialSavingsAtRenewal: number | null
    }>
  }
}

test('buildReportPayload persists partial-report unavailable sections as null instead of zero', () => {
  const reportAvailability = buildReportAvailability({
    usage: buildUnavailableSection('Connect OpenAI to unlock usage reporting.'),
    license: buildAvailableSection('Supported license data loaded successfully.'),
  })

  const payload = buildReportPayload(
    'job-1',
    'company-1',
    {
      usage: {
        frontierModelPercentage: 0,
        normalizedUsage: [],
        providerStatus: [],
        availability: buildUnavailableSection('Connect OpenAI to unlock usage reporting.'),
      },
      carbonWater: {
        totalCarbonKg: null,
        totalWaterLiters: null,
        modelEfficiencyScore: null,
        totalWaterBottles: null,
        carbonByModel: [],
        alternativeCarbonKg: null,
        carbonSavingsKg: null,
        waterSavingsLiters: null,
        carbonMethodology: null,
        waterMethodology: null,
        modelTaskMismatchRate: null,
        mismatchedModelClusters: [],
        unavailableReason: 'Connect OpenAI to unlock usage reporting.',
      },
      license: {
        providers: [],
        totalLicensedSeats: 42,
        totalActiveSeats: 30,
        totalDormantSeats: 12,
        overallUtilizationRate: 71,
        estimatedAnnualLicenseCost: 1000,
        potentialAnnualSavings: 200,
        renewalAlerts: [],
        providerStatus: [],
        availability: buildAvailableSection('Supported license data loaded successfully.'),
      },
      translator: {
        executiveNarrative: 'Partial report generated.',
        hypeCycleContext: '',
        decisions: [],
        incentivesAndBenefits: [],
        mitigationStrategies: [],
        esgDisclosureText: 'Usage-derived ESG metrics are unavailable.',
      },
      statAnalysis: {
        unavailable: true,
        message: 'Usage data unavailable.',
      },
      meta: {
        reportMode: reportAvailability.reportMode,
        sectionAvailability: reportAvailability.sectionAvailability,
        dataFreshness: {
          coverageStart: null,
          coverageEnd: null,
          latestCompleteDay: null,
          asOf: null,
        },
        providerStatuses: [],
      },
    },
    null,
    '2026-03'
  ) as ReportPayloadUnderTest

  assert.equal(payload.report_mode, 'partial')
  assert.equal(payload.section_availability.usage.status, 'unavailable')
  assert.equal(payload.carbon_kg, null)
  assert.equal(payload.water_liters, null)
  assert.equal(payload.model_efficiency_score, null)
  assert.equal(payload.license_utilization_rate, 71)
  assert.equal(payload.executive_summary.section_availability.usage.status, 'unavailable')
  assert.equal(payload.footprint_detail.unavailable_reason, 'Connect OpenAI to unlock usage reporting.')
  assert.equal(payload.benchmark_data.unavailable_reason, 'Connect OpenAI to unlock usage reporting.')
})

test('buildReportPayload keeps full report mode for OpenAI-backed reports even when license is unavailable', () => {
  const reportAvailability = buildReportAvailability({
    usage: buildAvailableSection('Supported usage data loaded successfully.'),
    license: buildUnavailableSection('Connect Microsoft 365 to unlock license utilization reporting.'),
  })

  const payload = buildReportPayload(
    'job-2',
    'company-2',
    {
      usage: {
        frontierModelPercentage: 63,
        normalizedUsage: [{ model: 'gpt-4o' }],
        providerStatus: [],
        availability: buildAvailableSection('Supported usage data loaded successfully.'),
      },
      carbonWater: {
        totalCarbonKg: 12.5,
        totalWaterLiters: 3200,
        modelEfficiencyScore: null,
        totalWaterBottles: 6166,
        carbonByModel: [],
        alternativeCarbonKg: 8.1,
        carbonSavingsKg: 4.4,
        waterSavingsLiters: 1200,
        carbonMethodology: 'method',
        waterMethodology: 'method',
        modelTaskMismatchRate: 0,
        mismatchedModelClusters: [],
        unavailableReason: null,
      },
      license: {
        providers: [],
        totalLicensedSeats: 0,
        totalActiveSeats: 0,
        totalDormantSeats: 0,
        overallUtilizationRate: null,
        estimatedAnnualLicenseCost: 0,
        potentialAnnualSavings: 0,
        renewalAlerts: [],
        providerStatus: [],
        availability: buildUnavailableSection('Connect Microsoft 365 to unlock license utilization reporting.'),
      },
      translator: {
        executiveNarrative: 'No usage was recorded in the coverage window.',
        hypeCycleContext: '',
        decisions: [],
        incentivesAndBenefits: [],
        mitigationStrategies: [],
        esgDisclosureText: 'No usage was recorded in the coverage window.',
      },
      statAnalysis: {
        anomaly_detection: { anomaly_detected: false },
        usage_trend: { trend_direction: 'stable' },
        carbon_percentile: { percentile: 5, industry_mean_kg: 100, industry_std_kg: 10, relative_position: 'below sector median (efficient)', method: 'test' },
        task_clustering: { clusters: [], method: 'test' },
      },
      meta: {
        reportMode: reportAvailability.reportMode,
        sectionAvailability: reportAvailability.sectionAvailability,
        dataFreshness: {
          coverageStart: '2026-03-01',
          coverageEnd: '2026-03-30',
          latestCompleteDay: '2026-03-30',
          asOf: '2026-03-31T12:00:00.000Z',
        },
        providerStatuses: [],
      },
    },
    {
      carbon_kg: 10,
      water_liters: 2000,
      model_efficiency_score: 80,
    },
    '2026-03'
  ) as ReportPayloadUnderTest

  assert.equal(payload.report_mode, 'full')
  assert.equal(payload.section_availability.license.status, 'unavailable')
  assert.equal(payload.license_utilization_rate, null)
  assert.equal(payload.model_efficiency_score, null)
  assert.equal(payload.prev_carbon_kg, 10)
})

test('buildReportPayload preserves nullable license pricing fields instead of coercing them to zero', () => {
  const reportAvailability = buildReportAvailability({
    usage: buildUnavailableSection('Connect OpenAI to unlock usage reporting.'),
    license: buildAvailableSection('Supported license data loaded successfully.'),
  })

  const payload = buildReportPayload(
    'job-3',
    'company-3',
    {
      usage: {
        frontierModelPercentage: 0,
        normalizedUsage: [],
        providerStatus: [],
        availability: buildUnavailableSection('Connect OpenAI to unlock usage reporting.'),
      },
      carbonWater: {
        totalCarbonKg: null,
        totalWaterLiters: null,
        modelEfficiencyScore: null,
        totalWaterBottles: null,
        carbonByModel: [],
        alternativeCarbonKg: null,
        carbonSavingsKg: null,
        waterSavingsLiters: null,
        carbonMethodology: null,
        waterMethodology: null,
        modelTaskMismatchRate: null,
        mismatchedModelClusters: [],
        unavailableReason: 'Connect OpenAI to unlock usage reporting.',
      },
      license: {
        providers: [{
          provider: 'Google Workspace Gemini',
          totalSeats: 180,
          activeSeats: 96,
          dormantSeats: 84,
          utilizationRate: 53,
          estimatedAnnualCost: null,
          potentialSavingsAtRenewal: null,
          recommendation: 'Pricing is not modeled in this build.',
        }],
        totalLicensedSeats: 180,
        totalActiveSeats: 96,
        totalDormantSeats: 84,
        overallUtilizationRate: 53,
        estimatedAnnualLicenseCost: null,
        potentialAnnualSavings: null,
        renewalAlerts: [],
        providerStatus: [],
        availability: buildAvailableSection('Supported license data loaded successfully.'),
      },
      translator: {
        executiveNarrative: 'Partial report generated.',
        hypeCycleContext: '',
        decisions: [],
        incentivesAndBenefits: [],
        mitigationStrategies: [],
        esgDisclosureText: 'Usage-derived ESG metrics are unavailable.',
      },
      statAnalysis: {
        unavailable: true,
        message: 'Usage data unavailable.',
      },
      meta: {
        reportMode: reportAvailability.reportMode,
        sectionAvailability: reportAvailability.sectionAvailability,
        dataFreshness: {
          coverageStart: null,
          coverageEnd: null,
          latestCompleteDay: null,
          asOf: null,
        },
        providerStatuses: [],
      },
    },
    null,
    '2026-03'
  ) as ReportPayloadUnderTest

  assert.equal(payload.license_utilization_rate, 53)
  assert.equal(payload.license_intelligence?.estimatedAnnualLicenseCost, null)
  assert.equal(payload.license_intelligence?.potentialAnnualSavings, null)
  assert.equal(payload.license_intelligence?.providers[0]?.estimatedAnnualCost, null)
  assert.equal(payload.license_intelligence?.providers[0]?.potentialSavingsAtRenewal, null)
})
