import { useRef, useEffect } from "react";

import languages from "./languages";

// From https://usehooks.com/usePrevious/
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

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

export function getBounds(
  points: [longitude: number, latitude: number][],
): [sw: [number, number], ne: [number, number]] {
  const lats = points.map(([, lat]) => lat);
  const lngs = points.map(([lng]) => lng);
  const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
  const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
  return [sw, ne];
}
