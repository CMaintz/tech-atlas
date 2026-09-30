import { useRef } from 'preact/hooks';

/**
 * A ref that always holds the latest `value`, for callbacks built once (a map's handlers)
 * that must read the current state.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
