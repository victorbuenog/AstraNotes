import { useCallback, useEffect, useRef } from 'react'

export function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delayMs: number,
): [debounced: (...args: Parameters<T>) => void, cancel: () => void] {
  const cbRef = useRef(callback)
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    cbRef.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (tRef.current) clearTimeout(tRef.current)
    }
  }, [])

  const cancel = useCallback(() => {
    if (tRef.current) clearTimeout(tRef.current)
    tRef.current = null
  }, [])

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (tRef.current) clearTimeout(tRef.current)
      tRef.current = setTimeout(() => {
        tRef.current = null
        cbRef.current(...args)
      }, delayMs)
    },
    [delayMs],
  )

  return [debounced, cancel]
}
