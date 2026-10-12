import { formatTime } from '../utils/format'

/**
 * Collapsed view of the trip once results are in. Shows the *geocoded*
 * addresses, so the driver can confirm we found the right places.
 */
export default function TripSummary({ plan, onEdit }) {
  return (
    <section className="trip-summary">
      <div className="trip-ends">
        <div><span className="end-dot start" />{plan.origin.address}</div>
        <div><span className="end-dot finish" />{plan.destination.address}</div>
      </div>
      <div className="trip-meta muted">
        Depart {formatTime(plan.departure)} · {Math.round(plan.load_lb).toLocaleString()} lb ·
        checkpoint every {plan.interval_mi} mi
      </div>
      <button type="button" className="secondary" onClick={onEdit}>Edit trip</button>
    </section>
  )
}
