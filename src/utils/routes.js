// Routes are lettered by rank (A = recommended) so cards and map labels match.
export const routeLetter = (route) => String.fromCharCode(64 + route.rank)

/** A plain-language, one-line verdict for a route, plus its tone for styling. */
export function routeVerdict(summary) {
  const m = summary.miles_by_level
  const mi = (n) => `${Math.round(n)} mi`
  if (summary.no_travel_miles > 0) {
    return { tone: 'danger', text: `Unsafe: ${mi(summary.no_travel_miles)} in No Travel conditions` }
  }
  if (summary.severe_miles > 0) {
    return { tone: 'danger', text: `${mi(summary.severe_miles)} of severe weather` }
  }
  if (summary.high_miles > 0) {
    return { tone: 'warn', text: `${mi(summary.high_miles)} of high-risk weather` }
  }
  if (m.Moderate > 0) {
    return { tone: 'caution', text: `Mostly clear · ${mi(m.Moderate)} moderate` }
  }
  return { tone: 'ok', text: 'Clear conditions the whole way' }
}
