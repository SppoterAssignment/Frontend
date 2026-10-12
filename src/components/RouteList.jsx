import { useMemo } from 'react'
import { formatDuration, formatMiles } from '../utils/format'
import { RISK_LEVELS } from '../utils/risk'
import { routeLetter, routeVerdict } from '../utils/routes'

export default function RouteList({ plan, selectedId, onSelect }) {
  // .sort() mutates its array, and props must never be mutated, so copy first.
  // useMemo: only re-sort when the plan changes, not on every slider tick.
  const ranked = useMemo(
    () => [...plan.routes].sort((a, b) => a.rank - b.rank),
    [plan.routes],
  )
  const best = ranked[0]

  return (
    <section>
      <h3 className="section-title">Compare routes</h3>
      <ul className="route-cards">
        {ranked.map((route) => (
          // key: a stable, unique id so React can match items between renders.
          // Never use the array index when the order can change (we sort!).
          <li key={route.id}>
            <RouteCard
              route={route}
              best={best}
              selected={route.id === selectedId}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

function RouteCard({ route, best, selected, onSelect }) {
  const verdict = routeVerdict(route.summary)
  const isBest = route.id === best.id
  const extra = route.duration_s - best.duration_s

  return (
    <button
      type="button"
      className={`route-card ${selected ? 'selected' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(route.id)}
    >
      <span className={`letter ${selected ? 'selected' : ''}`}>{routeLetter(route)}</span>
      <div className="card-body">
        <div className="card-head">
          <span className="route-name">{route.description}</span>
          {isBest && <span className="badge">Best</span>}
        </div>
        <div className="card-stats">
          <strong>{formatDuration(route.duration_s)}</strong>
          <span>{formatMiles(route.distance_mi)}</span>
          {!isBest && (
            <span className="muted">
              {extra >= 0 ? `+${formatDuration(extra)}` : `${formatDuration(-extra)} faster`}
            </span>
          )}
        </div>
        <RiskBar milesByLevel={route.summary.miles_by_level} />
        <div className={`card-verdict tone-${verdict.tone}`}>{verdict.text}</div>
      </div>
    </button>
  )
}

/** Horizontal bar showing what share of the route's miles fall in each risk level. */
function RiskBar({ milesByLevel }) {
  const total = Object.values(milesByLevel).reduce((a, b) => a + b, 0) || 1
  const label = RISK_LEVELS
    .filter((l) => milesByLevel[l.label] > 0)
    .map((l) => `${l.label} ${Math.round(milesByLevel[l.label])} mi`)
    .join(', ')
  return (
    <div className="risk-bar" role="img" aria-label={label} title={label}>
      {RISK_LEVELS.map(({ label: name, color }) => {
        const miles = milesByLevel[name] ?? 0
        if (miles <= 0) return null
        return <span key={name} style={{ width: `${(miles / total) * 100}%`, background: color }} />
      })}
    </div>
  )
}
