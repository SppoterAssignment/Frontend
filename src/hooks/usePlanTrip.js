import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPlan } from '../api/client'

/**
 * Owns the "plan a trip" request lifecycle: loading, success, error, cancel.
 *
 * status is one of 'idle' | 'loading' | 'success' | 'error'. A single status
 * field (instead of separate isLoading / isError booleans) makes impossible
 * combinations like "loading AND error" unrepresentable.
 */
export function usePlanTrip() {
  const [state, setState] = useState({ status: 'idle', data: null, error: null })

  // useRef: a mutable box that survives re-renders without causing one.
  // Holds the in-flight request's AbortController so we can cancel it.
  const controllerRef = useRef(null)

  const planTrip = useCallback(async (params) => {
    // A newer request supersedes the old one. Without this, a slow first
    // response could arrive after a fast second one and overwrite it.
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    // Keep the previous plan visible on the map while the new one loads.
    setState((prev) => ({ ...prev, status: 'loading', error: null }))
    try {
      const data = await fetchPlan(params, controller.signal)
      setState({ status: 'success', data, error: null })
      return data
    } catch (error) {
      if (error.name === 'AbortError') return null
      setState((prev) => ({ status: 'error', data: prev.data, error }))
      return null
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    setState((prev) => ({ ...prev, status: prev.data ? 'success' : 'idle' }))
  }, [])

  // Cleanup on unmount: don't leave a request running for a component that's gone.
  useEffect(() => () => controllerRef.current?.abort(), [])

  return { ...state, planTrip, cancel }
}
