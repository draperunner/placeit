import { useRef, useEffect } from "react";

export function usePrevious<T>(value: T): T | void {
  const ref = useRef<T | void>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
