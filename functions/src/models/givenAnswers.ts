import {
  FieldValue,
  GeoPoint,
  PartialWithFieldValue,
  Timestamp,
} from "firebase-admin/firestore";

export type GivenAnswerAppType = {
  questionId: string;
  participantId: string;
  answer: [longitude: number, latitude: number];
  distance: number;
  points: number;
  timestamp: Date;
};

export type GivenAnswerDbType = {
  questionId: string;
  participantId: string;
  answer: GeoPoint;
  distance: number;
  points: number;
  timestamp: Timestamp;
};

export function convertGivenAnswerToDb(
  givenAnswer:
    | GivenAnswerAppType
    | FieldValue
    | PartialWithFieldValue<GivenAnswerAppType>,
): GivenAnswerDbType | FieldValue | PartialWithFieldValue<GivenAnswerDbType> {
  return isActual(givenAnswer)
    ? {
        ...givenAnswer,
        answer: mapToGeopoint(givenAnswer.answer),
        timestamp:
          givenAnswer.timestamp instanceof Timestamp
            ? givenAnswer.timestamp.toDate()
            : givenAnswer.timestamp,
      }
    : givenAnswer;
}

export function convertGivenAnswerFromDb(
  answer: GivenAnswerDbType,
): GivenAnswerAppType {
  return {
    ...answer,
    answer: [answer.answer.longitude, answer.answer.latitude],
    timestamp: answer.timestamp.toDate(),
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
