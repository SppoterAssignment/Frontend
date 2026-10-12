import { formatDuration, formatMiles, formatTime } from '../utils/format'
import { routeLetter, routeVerdict } from '../utils/routes'

/** The answer first: which route to take and why, in plain language. */
export default function Recommendation({ plan }) {
  const best = plan.routes.find((r) => r.id === plan.recommended_id)
  const verdict = routeVerdict(best.summary)
  const unsafe = best.summary.no_travel_miles > 0

  return (
    <section className={`hero tone-${verdict.tone}`}>
      <div className="hero-kicker">{unsafe ? 'Least risky option — consider delaying' : 'Recommended route'}</div>
      <div className="hero-title">
        <span className="letter selected">{routeLetter(best)}</span>
        <h2>{best.description}</h2>
      </div>
      <div className="hero-stats">
        <span><strong>{formatDuration(best.duration_s)}</strong> drive</span>
        <span><strong>{formatMiles(best.distance_mi)}</strong></span>
        <span>Arrive <strong>{formatTime(best.arrival)}</strong></span>
      </div>
      <div className="hero-verdict">{verdict.text}</div>
      <p className="hero-why">{plan.recommendation_reason}</p>
    </section>
  )
}
