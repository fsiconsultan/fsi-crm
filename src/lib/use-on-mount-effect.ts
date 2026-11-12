import { useEffect, type EffectCallback } from "react"

// The one accepted effect: wiring a global listener once when a component mounts.
export function useOnMountEffect(effect: EffectCallback) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, [])
}
