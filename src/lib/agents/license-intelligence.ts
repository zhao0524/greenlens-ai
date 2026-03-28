import { getMicrosoftLicenseDetails, getMicrosoftCopilotUsage } from '@/lib/integrations/microsoft'

export async function runLicenseIntelligence(integrations: any[]) {
  const results: any = {
    providers: [], totalLicensedSeats: 0, totalActiveSeats: 0,
    totalDormantSeats: 0, overallUtilizationRate: 0,
    estimatedAnnualLicenseCost: 0, potentialAnnualSavings: 0, renewalAlerts: []
  }

  for (const integration of integrations) {
    try {
      if (integration.provider === 'microsoft') {
        const licenseData = await getMicrosoftLicenseDetails(integration.access_token)
        const copilotUsage = await getMicrosoftCopilotUsage(integration.access_token)

        // Count active seats from Microsoft Graph Reports API.
        // Data collection methodology: getMicrosoft365CopilotUsageUserDetail (D30 period).
        // Returns per-user activity flags only (hasCopilotActivity boolean).
        // Individual message content is never exposed through this API endpoint.
        let activeSeats = 0
        if (copilotUsage?.value) {
          activeSeats = copilotUsage.value.filter(
            (user: any) => user.hasCopilotActivity || user.copilotLastActivityDate
          ).length
        }

        const dormantSeats = licenseData.totalSeats - activeSeats
        const utilizationRate = licenseData.totalSeats > 0
          ? Math.round((activeSeats / licenseData.totalSeats) * 100) : 0

        results.providers.push({
          provider: 'Microsoft Copilot', totalSeats: licenseData.totalSeats,
          activeSeats, dormantSeats, utilizationRate,
          estimatedAnnualCost: licenseData.estimatedAnnualCost,
          potentialSavingsAtRenewal: dormantSeats * 30 * 12,
          recommendation: dormantSeats > 20
            ? `Right-size from ${licenseData.totalSeats} to ${activeSeats + 10} seats at renewal. ` +
              `Estimated saving: $${((dormantSeats - 10) * 30 * 12).toLocaleString()}/year.`
            : `Utilization healthy at ${utilizationRate}%. Monitor at next renewal.`
        })

        results.totalLicensedSeats += licenseData.totalSeats
        results.totalActiveSeats += activeSeats
        results.totalDormantSeats += dormantSeats
        results.estimatedAnnualLicenseCost += licenseData.estimatedAnnualCost
        results.potentialAnnualSavings += dormantSeats * 30 * 12

        const renewalDate = integration.metadata?.renewal_date
        if (renewalDate) {
          const monthsToRenewal = Math.round(
            (new Date(renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
          )
          if (monthsToRenewal <= 6) {
            results.renewalAlerts.push({
              provider: 'Microsoft', monthsToRenewal, renewalDate,
              actionRequired: `Right-sizing decision needed ${monthsToRenewal} months before renewal`
            })
          }
        }
      }
    } catch (error: any) {
      console.error(`License fetch failed for ${integration.provider}:`, error.message)
    }
  }

  results.overallUtilizationRate = results.totalLicensedSeats > 0
    ? Math.round((results.totalActiveSeats / results.totalLicensedSeats) * 100) : 0

  return results
}
