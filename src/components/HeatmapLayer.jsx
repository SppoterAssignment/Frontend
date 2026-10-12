import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { riskColor } from '../utils/risk'

const PANE = 'weather-heat'

// Low cells stay faint so the map reads as "fine" at a glance; risk darkens them.
const opacityFor = (score) => Math.min(0.12 + score * 0.13, 0.7)

/**
 * Weather risk grid for one forecast hour.
 *
 * Each grid point is a cell coloured by ITS OWN risk level, blurred via CSS
 * for a smooth look. (A classic additive heatmap sums overlapping points, which
 * paints many calm points as "hot" - misleading for a safety tool.)
 *
 * react-leaflet has no component for this, so we drive Leaflet directly:
 * effect 1 builds the cells when the data changes, effect 2 restyles them
 * when the hour changes.
 */
export default function HeatmapLayer({ heatmap, hour }) {
  const map = useMap()
  const cellsRef = useRef([])

  // Effect 1: create one rectangle per grid point (once per plan).
  useEffect(() => {
    if (!map.getPane(PANE)) {
      const pane = map.createPane(PANE)
      pane.style.zIndex = 350 // above tiles (200), below route lines (400)
      pane.style.pointerEvents = 'none'
    }
    // One shared canvas for every cell: far cheaper than one SVG element each.
    const renderer = L.canvas({ pane: PANE, padding: 0.5 })
    const { points, lat_step: dLat, lng_step: dLng } = heatmap

    const group = L.layerGroup(
      points.map(([lat, lng]) => L.rectangle(
        [[lat - dLat / 2, lng - dLng / 2], [lat + dLat / 2, lng + dLng / 2]],
        { renderer, pane: PANE, stroke: false, interactive: false, fillOpacity: 0 },
      )),
    ).addTo(map)
    cellsRef.current = group.getLayers()

    return () => {
      // Cleanup: remove old cells before building new ones (or on unmount).
      group.remove()
      renderer.remove()
      cellsRef.current = []
    }
  }, [map, heatmap])

  // Effect 2: recolour every cell for the chosen hour. No network, no new objects.
  useEffect(() => {
    cellsRef.current.forEach((cell, i) => {
      const score = heatmap.scores[i][hour]
      cell.setStyle({ fillColor: riskColor(Math.floor(score)), fillOpacity: opacityFor(score) })
    })
  }, [heatmap, hour])

  return null
}
