import { useCallback, useDeferredValue, useState } from 'react'
import CheckpointList from './components/CheckpointList'
import ErrorBoundary from './components/ErrorBoundary'
import Legend from './components/Legend'
import Recommendation from './components/Recommendation'
import RouteList from './components/RouteList'
import RouteMap from './components/RouteMap'
import TimeSlider from './components/TimeSlider'
import TripForm from './components/TripForm'
import TripSummary from './components/TripSummary'
import { usePlanTrip } from './hooks/usePlanTrip'

/**
 * App owns the state that several siblings share ("lifting state up"):
 *   plan        -> form (loading), route list, map, slider
 *   selectedId  -> route list (highlight) and map (highlight, truck)
 *   hour        -> slider and map (heatmap frame, truck position)
 * Children get data via props and report changes via callback props.
 */
export default function App() {
  const { status, data: plan, error, planTrip, cancel } = usePlanTrip()
  const [selectedId, setSelectedId] = useState(null)
  const [hour, setHour] = useState(0)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [editing, setEditing] = useState(true)

  // The slider thumb uses `hour` and moves instantly; the map gets a deferred
  // copy that React may render a beat later, so heavy map work never makes
  // dragging feel sticky.
  const deferredHour = useDeferredValue(hour)

  // useCallback keeps the same function identity across renders. It matters
  // when the function is a prop of a memoized child or an effect dependency.
  const handleSubmit = useCallback(async (params) => {
    const result = await planTrip(params)
    if (result) {
      // Reset view state for the new plan here, in the event handler,
      // rather than in a useEffect that watches `plan`.
      setSelectedId(result.recommended_id)
      setHour(0)
      setEditing(false)
    }
  }, [planTrip])

  const toggleHeatmap = useCallback(() => setShowHeatmap((v) => !v), [])

  const loading = status === 'loading'
  const selectedRoute = plan?.routes.find((r) => r.id === selectedId)
  const showForm = editing || !plan

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="brand">
          <h1>Safe Route Planner</h1>
          <p className="muted">Compare truck routes by the weather you'll actually drive into.</p>
        </header>

        {/* `hidden` instead of unmounting: an unmounted form would lose what the user typed. */}
        <div hidden={!showForm}>
          <TripForm
            onSubmit={handleSubmit}
            onCancel={cancel}
            loading={loading}
            serverErrors={error?.fieldErrors}
          />
          {plan && !loading && (
            <button type="button" className="link back" onClick={() => setEditing(false)}>
              ← Back to results
            </button>
          )}
        </div>

        {error && <div className="alert" role="alert">{error.message}</div>}

        {plan && !showForm && (
          <>
            <TripSummary plan={plan} onEdit={() => setEditing(true)} />
            <Recommendation plan={plan} />
            <RouteList plan={plan} selectedId={selectedId} onSelect={setSelectedId} />
            {selectedRoute && <CheckpointList route={selectedRoute} />}
          </>
        )}

        {!plan && !loading && (
          <ol className="how-it-works muted">
            <li>We find up to 3 routes between your stops.</li>
            <li>We check the forecast every few miles, <em>at the time you'll be there</em>.</li>
            <li>We recommend the route with the least severe weather, then the fastest.</li>
          </ol>
        )}
      </aside>

      <main className="map-area" aria-busy={loading}>
        <ErrorBoundary resetKey={plan} message="The map failed to render.">
          {/* setSelectedId is passed directly: React guarantees setters never change identity. */}
          <RouteMap
            plan={plan}
            selectedId={selectedId}
            onSelectRoute={setSelectedId}
            hour={deferredHour}
            showHeatmap={showHeatmap}
          />
        </ErrorBoundary>

        <Legend showHeatmap={plan && showHeatmap} />

        {plan && (
          <TimeSlider
            start={plan.heatmap.start}
            hours={plan.heatmap.hours}
            hour={hour}
            onHourChange={setHour}
            tripHours={(selectedRoute?.duration_s ?? 0) / 3600}
            showHeatmap={showHeatmap}
            onToggleHeatmap={toggleHeatmap}
          />
        )}

        {loading && (
          <div className="map-loading">
            <div className="loading-card">
              <span className="spinner" aria-hidden="true" />
              <div>
                <strong>Planning your trip…</strong>
                <div className="muted small">Finding routes and checking the forecast along each one</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
