import { useRef, useEffect } from "react";

import languages from "./languages";

// From https://usehooks.com/usePrevious/
export function usePrevious<T>(value: T): T | void {
  const ref = useRef<T | void>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export function getLanguageName(languageCode: string): string {
  return (
    languages.find(({ code }) => code === languageCode)?.name || languageCode
  );
}
