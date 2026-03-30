export function buildReportNavigationTarget(
  pathname: string,
  currentSearch: string,
  reportId: string
) {
  const params = new URLSearchParams(currentSearch)
  params.set('reportId', reportId)

  const nextSearch = params.toString()
  return nextSearch ? `${pathname}?${nextSearch}` : pathname
}
