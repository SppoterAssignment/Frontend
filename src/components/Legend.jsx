import { RISK_LEVELS } from '../utils/risk'

export default function Legend({ showHeatmap }) {
  return (
    <div className="legend" aria-label="Risk legend">
      <div className="legend-items">
        {RISK_LEVELS.map(({ label, color }) => (
          <span key={label}>
            <i style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
      <div className="legend-note muted">
        Dots: risk at each checkpoint when you pass it.
        {showHeatmap && ' Shading: forecast risk at the slider time.'}
      </div>
    </div>
  )
}
