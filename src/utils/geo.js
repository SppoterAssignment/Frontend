import polyline from '@mapbox/polyline'

const EARTH_RADIUS_MI = 3958.8
const toRad = (deg) => (deg * Math.PI) / 180

function haversineMiles([lat1, lng1], [lat2, lng2]) {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h))
}

/** Decode the API's encoded polyline and precompute the distance to each point. */
export function decodeRoute(encoded) {
  const points = polyline.decode(encoded)
  const cumMiles = [0]
  for (let i = 1; i < points.length; i++) {
    cumMiles.push(cumMiles[i - 1] + haversineMiles(points[i - 1], points[i]))
  }
  return { points, cumMiles }
}

/** First index where arr[i] >= x (arr sorted ascending). */
function lowerBound(arr, x) {
  let lo = 0
  let hi = arr.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (arr[mid] < x) lo = mid + 1
    else hi = mid
  }
  return lo
}

function pointAtMile({ points, cumMiles }, mile) {
  const i = lowerBound(cumMiles, mile)
  if (i === 0) return points[0]
  const [m0, m1] = [cumMiles[i - 1], cumMiles[i]]
  const t = m1 === m0 ? 0 : (mile - m0) / (m1 - m0)
  const [a, b] = [points[i - 1], points[i]]
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]
}

/**
 * Where the truck is on `route` at time `t` (ms), interpolating mile by checkpoint ETAs
 * and then snapping to the road geometry.
 */
export function truckPosition(route, decoded, t) {
  const cps = route.checkpoints
  const etas = cps.map((c) => Date.parse(c.eta))

  let mile
  if (t <= etas[0]) mile = 0
  else if (t >= etas[etas.length - 1]) mile = cps[cps.length - 1].mile
  else {
    const i = lowerBound(etas, t)
    const f = (t - etas[i - 1]) / (etas[i] - etas[i - 1])
    mile = cps[i - 1].mile + f * (cps[i].mile - cps[i - 1].mile)
  }

  // Nearest checkpoint tells us the forecast risk at that moment.
  const nearest = cps.reduce((best, c) =>
    Math.abs(c.mile - mile) < Math.abs(best.mile - mile) ? c : best)

  return {
    mile,
    latlng: pointAtMile(decoded, mile),
    arrived: t >= etas[etas.length - 1],
    departed: t > etas[0],
    level: nearest.level,
  }
}
