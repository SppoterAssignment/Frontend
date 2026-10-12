import { useState } from 'react'
import { nextFullHour, toLocalInputValue } from '../utils/format'

const INTERVALS = [10, 25, 50]
const EXAMPLES = [
  ['Dallas, TX', 'Denver, CO'],
  ['Chicago, IL', 'Nashville, TN'],
  ['Salt Lake City, UT', 'Cheyenne, WY'],
]
const MAX_LOAD_LB = 200_000
const MAX_DAYS_AHEAD = 7

// Lazy initial state: React calls this once, not on every render.
const initialValues = () => ({
  origin: '',
  destination: '',
  departure: toLocalInputValue(nextFullHour()),
  load_lb: '40000', // inputs always give strings; convert on submit
  interval_mi: 25,
})

function validate(values) {
  const errors = {}
  const origin = values.origin.trim()
  const destination = values.destination.trim()

  if (!origin) errors.origin = 'Enter where the trip starts.'
  if (!destination) errors.destination = 'Enter where the trip ends.'
  else if (origin.toLowerCase() === destination.toLowerCase()) {
    errors.destination = 'Destination must differ from origin.'
  }

  const departure = new Date(values.departure)
  const now = Date.now()
  if (Number.isNaN(departure.getTime())) errors.departure = 'Pick a departure date and time.'
  else if (departure.getTime() < now - 60 * 60 * 1000) errors.departure = 'Departure is in the past.'
  else if (departure.getTime() > now + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000) {
    errors.departure = `Forecasts only reach ${MAX_DAYS_AHEAD} days ahead.`
  }

  const load = Number(values.load_lb)
  if (values.load_lb === '' || !Number.isFinite(load)) errors.load_lb = 'Enter the load weight.'
  else if (load < 0 || load > MAX_LOAD_LB) {
    errors.load_lb = `Weight must be between 0 and ${MAX_LOAD_LB.toLocaleString()} lb.`
  }
  return errors
}

export default function TripForm({ onSubmit, onCancel, loading, serverErrors }) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})

  // One handler for every input, keyed by the input's `name` attribute.
  function handleChange(event) {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
    // Clear that field's error as soon as the user starts fixing it.
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  // Not named "useExample": the `use` prefix is reserved for hooks.
  function fillExample([origin, destination]) {
    setValues((prev) => ({ ...prev, origin, destination }))
    setErrors({})
  }

  function swapEnds() {
    setValues((prev) => ({ ...prev, origin: prev.destination, destination: prev.origin }))
  }

  function handleSubmit(event) {
    event.preventDefault() // stop the browser's full-page form submission
    if (loading) return // guard against Enter-key double submits

    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    onSubmit({
      origin: values.origin.trim(),
      destination: values.destination.trim(),
      departure: new Date(values.departure).toISOString(), // local -> UTC ISO
      load_lb: Number(values.load_lb),
      interval_mi: Number(values.interval_mi),
    })
  }

  // Client errors win; server errors fill in anything the client couldn't know.
  const errorFor = (field) => errors[field] ?? serverErrors?.[field]?.[0]

  return (
    <form className="trip-form" onSubmit={handleSubmit} noValidate>
      <div className="endpoints">
        <Field label="Origin" error={errorFor('origin')}>
          <input
            name="origin"
            value={values.origin}
            onChange={handleChange}
            placeholder="e.g. Dallas, TX"
            autoComplete="off"
            maxLength={200}
          />
        </Field>
        <button type="button" className="swap" onClick={swapEnds} aria-label="Swap origin and destination">
          ⇅
        </button>
        <Field label="Destination" error={errorFor('destination')}>
          <input
            name="destination"
            value={values.destination}
            onChange={handleChange}
            placeholder="e.g. Denver, CO"
            autoComplete="off"
            maxLength={200}
          />
        </Field>
      </div>

      {!values.origin && !values.destination && (
        <div className="examples">
          <span className="muted small">Try:</span>
          {EXAMPLES.map((pair) => (
            <button type="button" key={pair.join('-')} className="chip-button" onClick={() => fillExample(pair)}>
              {pair[0].split(',')[0]} → {pair[1].split(',')[0]}
            </button>
          ))}
        </div>
      )}

      <div className="row">
        <Field label="Departure" error={errorFor('departure')}>
          <input
            type="datetime-local"
            name="departure"
            value={values.departure}
            onChange={handleChange}
          />
        </Field>
        <Field
          label="Load (lb)"
          error={errorFor('load_lb')}
          hint="Heavier loads raise wind risk"
        >
          <input
            type="number"
            name="load_lb"
            value={values.load_lb}
            onChange={handleChange}
            min="0"
            max={MAX_LOAD_LB}
            step="500"
            inputMode="numeric"
          />
        </Field>
      </div>

      <fieldset className="interval">
        <legend>Check weather every</legend>
        <div className="segmented">
          {INTERVALS.map((mi) => (
            <label key={mi} className={Number(values.interval_mi) === mi ? 'active' : ''}>
              <input
                type="radio"
                name="interval_mi"
                value={mi}
                checked={Number(values.interval_mi) === mi}
                onChange={handleChange}
              />
              {mi} mi
            </label>
          ))}
        </div>
      </fieldset>

      <div className="actions">
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Planning routes…' : 'Find safest route'}
        </button>
        {loading && (
          <button type="button" className="link" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </form>
  )
}

// Small presentational component: label + control + error message.
function Field({ label, error, hint, children }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {error
        ? <span className="field-error" role="alert">{error}</span>
        : hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
