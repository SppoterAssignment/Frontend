import { useEffect, useState } from 'react'
import { formatTime } from '../utils/format'

const PLAY_STEP_MS = 700

export default function TimeSlider({
  start, hours, hour, onHourChange, tripHours, showHeatmap, onToggleHeatmap,
}) {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => {
      // Functional update: the interval callback was created once, so a plain
      // `hour` here would be frozen at its value from that render (a "stale
      // closure"). Passing a function always receives the latest value.
      onHourChange((h) => (h >= hours ? 0 : h + 1))
    }, PLAY_STEP_MS)
    // Cleanup runs before the next effect and on unmount: stops the timer.
    return () => clearInterval(id)
  }, [playing, hours, onHourChange])

  const time = Date.parse(start) + hour * 3600 * 1000
  const tripPct = Math.min(tripHours / hours, 1) * 100
  const phase = hour === 0 ? 'Departure' : hour < tripHours ? 'On the road' : 'After arrival'

  return (
    <div className="time-slider">
      <button
        type="button"
        className="play"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? 'Pause forecast animation' : 'Play forecast animation'}
      >
        {playing ? '❚❚' : '▶'}
      </button>

      <div className="slider-body">
        <div className="slider-labels">
          <span>
            <strong>{formatTime(time)}</strong>
            <span className="muted"> · +{hour}h · {phase}</span>
          </span>
          <span className="muted small">Forecast time</span>
        </div>
        <div className="track">
          {/* Highlights the hours the selected route is actually driving. */}
          <div className="trip-band" style={{ width: `${tripPct}%` }} title="Selected route's drive time" />
          <input
            type="range"
            min={0}
            max={hours}
            step={1}
            value={hour}
            onChange={(e) => {
              setPlaying(false) // the user grabbed the slider: stop autoplay
              onHourChange(Number(e.target.value))
            }}
            aria-label="Forecast hour"
            aria-valuetext={`${formatTime(time)}, ${hour} hours after departure`}
          />
        </div>
        <div className="slider-ticks muted">
          <span>Depart</span><span>+12h</span><span>+24h</span><span>+36h</span><span>+48h</span>
        </div>
      </div>

      <label className="toggle">
        <input type="checkbox" checked={showHeatmap} onChange={onToggleHeatmap} />
        Weather
      </label>
    </div>
  )
}
