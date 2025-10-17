import { useRef, useEffect } from "react";
import { Feature, Point, Polygon } from "geojson";

import languages from "./languages";
import {
  booleanPointInPolygon,
  nearestPointOnLine,
  polygon,
  polygonToLine,
} from "@turf/turf";
import { Question } from "./interfaces";

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

export function getClosestPointOnPolygon(
  point: Feature<Point>,
  polygon: Feature<Polygon>,
): Feature<Point> {
  const inside = booleanPointInPolygon(point, polygon, {
    ignoreBoundary: false,
  });

  if (inside) {
    return point;
  }

  const boundary = polygonToLine(polygon);

  if (boundary.type === "FeatureCollection") {
    // Don't consider inner rings/holes:
    const exteriorRing = boundary.features[0];
    return nearestPointOnLine(exteriorRing, point);
  }

  return nearestPointOnLine(boundary, point);
}

export function questionToPolygon(question: Question): Feature<Polygon> {
  const coordinates = question.geometry.coordinates.map(
    (coord) => [coord.longitude, coord.latitude] as [number, number],
  );

  return polygon([coordinates]);
}

export function formatDistance(meters: number): string {
  if (meters > 10000) {
    return `${Math.round(meters / 1000)} km`;
  }
  if (meters > 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
