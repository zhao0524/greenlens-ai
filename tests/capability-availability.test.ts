import test from 'node:test'
import assert from 'node:assert/strict'

import { runUsageAnalyst } from '../src/lib/agents/usage-analyst'
import { runLicenseIntelligence } from '../src/lib/agents/license-intelligence'
import { calculateCarbon } from '../src/lib/calculations/carbon'
import {
  buildReportAvailability,
  buildAvailableSection,
  buildUnavailableSection,
} from '../src/lib/analysis/provider-status'
import {
  DEMO_SENTINEL_GOOGLE,
  DEMO_SENTINEL_MICROSOFT,
  DEMO_SENTINEL_OPENAI,
} from '../src/lib/demo/fake-data'
import type { IntegrationRecord } from '../src/lib/integrations/types'

function buildIntegration(provider: string, accessToken: string): IntegrationRecord {
  return {
    id: `${provider}-integration`,
    provider,
    access_token: accessToken,
    refresh_token: null,
    token_expires_at: null,
    is_active: true,
    metadata: null,
  }
}

test('OpenAI-only availability stays full while license remains unavailable', async () => {
  const usageResult = await runUsageAnalyst([
    buildIntegration('openai', DEMO_SENTINEL_OPENAI),
  ])
  const licenseResult = await runLicenseIntelligence([
    buildIntegration('openai', DEMO_SENTINEL_OPENAI),
  ])
  const availability = buildReportAvailability({
    usage: usageResult.availability,
    license: licenseResult.availability,
  })

  assert.equal(usageResult.availability.status, 'available')
  assert.equal(licenseResult.availability.status, 'unavailable')
  assert.equal(availability.reportMode, 'full')
  assert.equal(availability.sectionAvailability.usage.status, 'available')
  assert.equal(availability.sectionAvailability.license.status, 'unavailable')
})

test('Microsoft-only availability produces a partial report with license data but unavailable usage sections', async () => {
  const microsoftIntegration = buildIntegration('microsoft', DEMO_SENTINEL_MICROSOFT)
  const usageResult = await runUsageAnalyst([microsoftIntegration])
  const licenseResult = await runLicenseIntelligence([microsoftIntegration])
  const availability = buildReportAvailability({
    usage: usageResult.availability,
    license: licenseResult.availability,
  })

  assert.equal(usageResult.availability.status, 'unavailable')
  assert.equal(licenseResult.availability.status, 'available')
  assert.equal(availability.reportMode, 'partial')
  assert.equal(availability.sectionAvailability.license.status, 'available')
  assert.equal(availability.sectionAvailability.usage.status, 'unavailable')
  assert.equal(availability.sectionAvailability.carbon_water.status, 'unavailable')
})

test('Google-only availability unlocks license reporting while usage-derived sections remain unavailable', async () => {
  const googleIntegration = buildIntegration('google', DEMO_SENTINEL_GOOGLE)
  const usageResult = await runUsageAnalyst([googleIntegration])
  const licenseResult = await runLicenseIntelligence([googleIntegration])
  const availability = buildReportAvailability({
    usage: usageResult.availability,
    license: licenseResult.availability,
  })

  assert.equal(usageResult.availability.status, 'unavailable')
  assert.equal(licenseResult.availability.status, 'available')
  assert.equal(availability.reportMode, 'partial')
  assert.equal(availability.sectionAvailability.usage.status, 'unavailable')
  assert.equal(availability.sectionAvailability.license.status, 'available')
  assert.equal(licenseResult.totalLicensedSeats, 180)
  assert.equal(licenseResult.totalActiveSeats, 96)
  assert.equal(licenseResult.totalDormantSeats, 84)
  assert.equal(licenseResult.estimatedAnnualLicenseCost, null)
  assert.equal(licenseResult.potentialAnnualSavings, null)
  assert.equal(
    usageResult.providerStatus.find((status) => status.provider === 'google')?.capability,
    'usage'
  )
  assert.equal(
    licenseResult.providerStatus.find((status) => status.provider === 'google')?.capability,
    'license'
  )
  assert.equal(
    licenseResult.providerStatus.find((status) => status.provider === 'google')?.status,
    'fresh'
  )
})

test('Microsoft plus Google keeps aggregate seat utilization but clears aggregate pricing when any provider lacks pricing', async () => {
  const licenseResult = await runLicenseIntelligence([
    buildIntegration('microsoft', DEMO_SENTINEL_MICROSOFT),
    buildIntegration('google', DEMO_SENTINEL_GOOGLE),
  ])

  assert.equal(licenseResult.availability.status, 'available')
  assert.equal(licenseResult.totalLicensedSeats, 680)
  assert.equal(licenseResult.totalActiveSeats, 434)
  assert.equal(licenseResult.totalDormantSeats, 246)
  assert.equal(licenseResult.overallUtilizationRate, 64)
  assert.equal(licenseResult.estimatedAnnualLicenseCost, null)
  assert.equal(licenseResult.potentialAnnualSavings, null)
  assert.equal(licenseResult.providers.length, 2)
  assert.equal(
    licenseResult.providers.find((provider) => provider.provider === 'Google Workspace Gemini')?.estimatedAnnualCost,
    null
  )
})

test('OpenAI plus Google keeps the report full while Google contributes license data', async () => {
  const integrations = [
    buildIntegration('openai', DEMO_SENTINEL_OPENAI),
    buildIntegration('google', DEMO_SENTINEL_GOOGLE),
  ]
  const usageResult = await runUsageAnalyst(integrations)
  const licenseResult = await runLicenseIntelligence(integrations)
  const availability = buildReportAvailability({
    usage: usageResult.availability,
    license: licenseResult.availability,
  })

  assert.equal(usageResult.availability.status, 'available')
  assert.equal(licenseResult.availability.status, 'available')
  assert.equal(availability.reportMode, 'full')
  assert.equal(availability.sectionAvailability.usage.status, 'available')
  assert.equal(availability.sectionAvailability.license.status, 'available')
})

test('calculateCarbon returns a null efficiency score when no usage data is available', async () => {
  const result = await calculateCarbon([])

  assert.equal(result.totalCarbonKg, 0)
  assert.equal(result.modelEfficiencyScore, null)
})

test('buildReportAvailability marks usage-derived sections unavailable when usage is unavailable', () => {
  const availability = buildReportAvailability({
    usage: buildUnavailableSection('Connect OpenAI to unlock usage reporting.'),
    license: buildAvailableSection('Supported license data loaded successfully.'),
  })

  assert.equal(availability.reportMode, 'partial')
  assert.equal(availability.sectionAvailability.usage.status, 'unavailable')
  assert.equal(availability.sectionAvailability.model_efficiency.status, 'unavailable')
  assert.equal(availability.sectionAvailability.esg.status, 'unavailable')
  assert.equal(availability.sectionAvailability.license.status, 'available')
})
