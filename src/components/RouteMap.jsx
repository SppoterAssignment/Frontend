import L from 'leaflet'
import { Fragment, memo, useEffect, useMemo } from 'react'
import {
  CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap,
} from 'react-leaflet'
import { decodeRoute, truckPosition } from '../utils/geo'
import { formatDuration, formatMiles, formatTime } from '../utils/format'
import { riskColor, riskLabel } from '../utils/risk'
import { routeLetter, routeVerdict } from '../utils/routes'
import HeatmapLayer from './HeatmapLayer'

const US_CENTER = [39.5, -98.35]
const SELECTED_COLOR = '#1d4ed8'
const OTHER_COLOR = '#475569'

// Created once at module level; a new icon object every render would make
// Leaflet replace the marker's DOM element on every slider tick.
const truckIcon = L.divIcon({
  className: 'truck-icon',
  html: '<span>🚚</span>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

const endIcon = (text, kind) => L.divIcon({
  className: `end-icon ${kind}`,
  html: `<span>${text}</span>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})
const START_ICON = endIcon('', 'start')
const FINISH_ICON = endIcon('⚑', 'finish')

// Put each route's letter at a different point along it so labels don't overlap.
const LABEL_POSITION_BY_RANK = [0.5, 0.35, 0.65]

// Cache: one icon object per (letter, selected) pair instead of one per render.
const labelIcons = new Map()
function labelIcon(letter, selected) {
  const key = `${letter}-${selected}`
  if (!labelIcons.has(key)) {
    labelIcons.set(key, L.divIcon({
      className: `route-label ${selected ? 'selected' : ''}`,
      html: `<span>${letter}</span>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }))
  }
  return labelIcons.get(key)
}

export default function RouteMap({ plan, selectedId, onSelectRoute, hour, showHeatmap }) {
  // Decoding thousands of points is the heaviest work on the page.
  // useMemo re-runs it only when `plan` changes, not on every slider move.
  const decoded = useMemo(
    () => (plan ? plan.routes.map((r) => decodeRoute(r.encoded_polyline)) : []),
    [plan],
  )

  const bounds = useMemo(() => {
    if (!decoded.length) return null
    return L.latLngBounds(decoded.flatMap((d) => d.points))
  }, [decoded])

  const selectedRoute = plan?.routes.find((r) => r.id === selectedId)
  // A number, not a Date: hook dependencies are compared by reference, and a
  // new Date object every render would defeat TruckMarker's useMemo.
  const sliderTimeMs = plan ? Date.parse(plan.heatmap.start) + hour * 3600 * 1000 : null

  return (
    <MapContainer center={US_CENTER} zoom={4} preferCanvas className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={18}
      />
      <FitBounds bounds={bounds} />
      {plan && showHeatmap && <HeatmapLayer heatmap={plan.heatmap} hour={hour} />}
      {plan && (
        <RouteLayers
          routes={plan.routes}
          decoded={decoded}
          selectedId={selectedId}
          recommendedId={plan.recommended_id}
          onSelectRoute={onSelectRoute}
        />
      )}
      {plan && (
        <>
          <Marker position={[plan.origin.lat, plan.origin.lng]} icon={START_ICON}>
            <Tooltip direction="top" offset={[0, -12]}>Start: {plan.origin.address}</Tooltip>
          </Marker>
          <Marker position={[plan.destination.lat, plan.destination.lng]} icon={FINISH_ICON}>
            <Tooltip direction="top" offset={[0, -12]}>End: {plan.destination.address}</Tooltip>
          </Marker>
        </>
      )}
      {selectedRoute && (
        <TruckMarker
          route={selectedRoute}
          decoded={decoded[selectedRoute.id]}
          timeMs={sliderTimeMs}
        />
      )}
    </MapContainer>
  )
}

/** Zoom the map to the routes whenever a new plan arrives. */
function FitBounds({ bounds }) {
  const map = useMap()
  useEffect(() => {
    if (bounds?.isValid()) {
      // Leave room for the sidebar-side legend and the bottom slider.
      map.fitBounds(bounds, { paddingTopLeft: [40, 70], paddingBottomRight: [40, 140] })
    }
  }, [map, bounds])
  return null
}

/**
 * All route lines and checkpoint markers.
 *
 * memo(): skip re-rendering when props are unchanged. While the slider moves,
 * only `hour` changes in the parent, so these hundreds of markers are left
 * alone. That only works because every prop is stable between renders:
 * `decoded` is memoized and `onSelectRoute` is a state setter.
 */
const RouteLayers = memo(function RouteLayers({
  routes, decoded, selectedId, recommendedId, onSelectRoute,
}) {
  // Draw the selected route last so it sits on top.
  const ordered = [...routes].sort((a, b) => (a.id === selectedId) - (b.id === selectedId))

  return ordered.map((route) => {
    const selected = route.id === selectedId
    const select = { click: () => onSelectRoute(route.id) }
    const { points } = decoded[route.id]
    const fraction = LABEL_POSITION_BY_RANK[route.rank - 1] ?? 0.5
    const labelAt = points[Math.floor((points.length - 1) * fraction)]

    return (
      // Fragment groups siblings without adding a DOM node; in a list it still needs a key.
      <Fragment key={route.id}>
        {/* Wide transparent line underneath: makes thin routes easy to click/hover. */}
        <Polyline
          positions={points}
          pathOptions={{ color: '#000', opacity: 0, weight: 18 }}
          eventHandlers={select}
        >
          <Tooltip sticky>
            <RouteSummary route={route} recommended={route.id === recommendedId} />
          </Tooltip>
        </Polyline>
        <Polyline
          positions={points}
          interactive={false}
          pathOptions={{
            color: selected ? SELECTED_COLOR : OTHER_COLOR,
            weight: selected ? 6 : 4,
            opacity: selected ? 0.95 : 0.6,
            dashArray: selected ? null : '6 8',
          }}
        />

        <Marker
          position={labelAt}
          icon={labelIcon(routeLetter(route), selected)}
          eventHandlers={select}
          zIndexOffset={selected ? 500 : 0}
        />

        {route.checkpoints.map((cp) => (
          <CircleMarker
            key={cp.mile}
            center={[cp.lat, cp.lng]}
            radius={selected ? 6 : 4}
            pathOptions={{
              color: '#fff',
              weight: 1.5,
              fillColor: riskColor(cp.level),
              fillOpacity: selected ? 1 : 0.55,
              opacity: selected ? 1 : 0.55,
            }}
            eventHandlers={select}
          >
            <Popup>
              <CheckpointPopup cp={cp} route={route} />
            </Popup>
          </CircleMarker>
        ))}
      </Fragment>
    )
  })
})

function RouteSummary({ route, recommended }) {
  const verdict = routeVerdict(route.summary)
  return (
    <div className="map-tip">
      <strong>Route {routeLetter(route)} · {route.description}</strong>
      {recommended && <span className="badge">Recommended</span>}
      <div>{formatMiles(route.distance_mi)} · {formatDuration(route.duration_s)} · arrive {formatTime(route.arrival)}</div>
      <div className={`tone-${verdict.tone}`}>{verdict.text}</div>
      <div className="muted">Click to select</div>
    </div>
  )
}

function CheckpointPopup({ cp, route }) {
  return (
    <div className="cp-popup">
      <div className="cp-level" style={{ background: riskColor(cp.level) }}>{cp.level_label} risk</div>
      <div><strong>{formatTime(cp.eta)}</strong> · mile {Math.round(cp.mile)} on Route {routeLetter(route)}</div>
      <table>
        <tbody>
          <tr><td>Wind</td><td>{cp.wind_mph.toFixed(0)} mph <span className="muted">(gusts {cp.gust_mph.toFixed(0)})</span></td></tr>
          <tr><td>Rain</td><td>{cp.rain_in_hr.toFixed(2)} in/hr</td></tr>
          <tr><td>Snow</td><td>{cp.snow_in_hr.toFixed(2)} in/hr</td></tr>
        </tbody>
      </table>
      {cp.reasons.length > 0 && <div className="cp-reasons">Because of {cp.reasons.join(', ')}</div>}
    </div>
  )
}

function TruckMarker({ route, decoded, timeMs }) {
  const pos = useMemo(() => truckPosition(route, decoded, timeMs), [route, decoded, timeMs])
  const status = !pos.departed
    ? 'Departing'
    : pos.arrived
      ? 'Arrived'
      : `Mile ${Math.round(pos.mile)} · ${riskLabel(pos.level)} risk`
  return (
    <Marker position={pos.latlng} icon={truckIcon} zIndexOffset={1000}>
      <Tooltip direction="top" offset={[0, -16]} permanent className="truck-tip">
        {status}
      </Tooltip>
    </Marker>
  )
}
