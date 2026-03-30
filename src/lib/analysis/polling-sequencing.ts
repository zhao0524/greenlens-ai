export function shouldApplyPollResponse(
  activeSessionId: number,
  responseSessionId: number,
  requestToken: number,
  lastAppliedToken: number
) {
  return responseSessionId === activeSessionId && requestToken >= lastAppliedToken
}
