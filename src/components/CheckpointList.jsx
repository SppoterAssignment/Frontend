import { useState } from 'react'
import { formatTime } from '../utils/format'
import { riskColor } from '../utils/risk'
import { routeLetter } from '../utils/routes'

const PREVIEW_COUNT = 6

/** The selected route's checkpoints as a timeline: when you'll be where, and what weather. */
export default function CheckpointList({ route }) {
  const [expanded, setExpanded] = useState(false)

  // Derived data: computed from props during render, NOT stored in state.
  // Storing it would mean keeping two copies in sync by hand.
  const risky = route.checkpoints.filter((c) => c.level > 0)
  const source = risky.length ? risky : route.checkpoints
  const rows = expanded ? route.checkpoints : source.slice(0, PREVIEW_COUNT)
  const hidden = route.checkpoints.length - rows.length

  return (
    <section className="checkpoints">
      <h3 className="section-title">
        Weather along route {routeLetter(route)}
        <span className="muted"> · {route.checkpoints.length} checkpoints</span>
      </h3>
      {!expanded && (
        <p className="muted small">
          {risky.length
            ? `${risky.length} checkpoint${risky.length > 1 ? 's' : ''} with elevated risk:`
            : 'Every checkpoint is Low risk at the time you reach it.'}
        </p>
      )}

      <ol className="timeline">
        {rows.map((c) => (
          <li key={c.mile}>
            <span className="dot" style={{ background: riskColor(c.level) }} />
            <div>
              <div>
                <strong>{formatTime(c.eta)}</strong>
                <span className="muted"> · mile {Math.round(c.mile)}</span>
              </div>
              <div className="muted small">
                {c.level_label}
                {' · '}
                {c.reasons.length
                  ? c.reasons.join(', ')
                  : `wind ${Math.round(c.wind_mph)} mph, ${c.rain_in_hr > 0 ? `rain ${c.rain_in_hr.toFixed(2)} in/hr` : 'dry'}`}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {(hidden > 0 || expanded) && (
        <button type="button" className="link" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show less' : `Show all ${route.checkpoints.length} checkpoints`}
        </button>
      )}
    </section>
  )
}
