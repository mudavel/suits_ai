import { useCallback, useEffect, useRef, useState } from 'react'

export function useRemote(loader) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ data: null, error: null, loader: null, revision: -1 })
  const reload = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    loader(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ data, error: null, loader, revision })
    }).catch(error => {
      if (!controller.signal.aborted) setState(previous => ({ data: previous.loader === loader ? previous.data : null, error, loader, revision }))
    })
    return () => controller.abort()
  }, [loader, revision])
  const loading = state.loader !== loader || state.revision !== revision
  return { data: state.loader === loader ? state.data : null, error: loading ? null : state.error, loading, reload }
}

export function useAction() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const busy = useRef(false)
  const mounted = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const run = async (operation, onSuccess) => {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError(null)
    try {
      const result = await operation()
      if (mounted.current) onSuccess?.(result)
      return result
    } catch (failure) {
      if (mounted.current) setError(failure)
    } finally {
      busy.current = false
      if (mounted.current) setPending(false)
    }
  }
  return { pending, error, run, clearError: () => setError(null) }
}
