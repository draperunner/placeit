import {
  FieldValue,
  GeoPoint,
  PartialWithFieldValue,
} from "firebase-admin/firestore";

export type QuestionAppType = {
  id: string;
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: [longitude: number, latitude: number][][];
  };
  properties: {
    text: string;
  };
};

export type QuestionDbType = {
  id: string;
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: GeoPoint[];
  };
  properties: {
    text: string;
  };
};

export function convertQuestionToDb(
  question:
    | QuestionAppType
    | FieldValue
    | PartialWithFieldValue<QuestionAppType>,
): QuestionDbType | FieldValue | PartialWithFieldValue<QuestionDbType> {
  if (!isActual(question)) {
    return question;
  }

  return {
    ...question,
    geometry: isActual(question.geometry)
      ? {
          ...question.geometry,
          coordinates: isActual(question.geometry.coordinates)
            ? isActual(question.geometry.coordinates[0])
              ? (question.geometry.coordinates[0]?.map(mapToGeopoint) ?? [])
              : undefined
            : question.geometry.coordinates,
        }
      : question.geometry,
  };
}

export function convertQuestionFromDb(
  question: QuestionDbType,
): QuestionAppType {
  return {
    ...question,
    geometry: {
      ...question.geometry,
      coordinates: [
        question.geometry.coordinates.map((coord) => [
          coord.longitude,
          coord.latitude,
        ]),
      ],
    },
  };
}

function mapToGeopoint(
  coord:
    | PartialWithFieldValue<[longitude: number, latitude: number]>
    | FieldValue
    | undefined,
): GeoPoint | FieldValue | undefined {
  if (!coord || coord instanceof FieldValue) {
    return coord;
  }

  if (
    !coord[0] ||
    !coord[1] ||
    coord[1] instanceof FieldValue ||
    coord[0] instanceof FieldValue
  ) {
    return undefined;
  }

  return new GeoPoint(coord[1], coord[0]);
}

function isActual<T>(value: T | FieldValue | null | undefined): value is T {
  return (
    value !== undefined && value !== null && !(value instanceof FieldValue)
  );
}
