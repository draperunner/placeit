import {
  FieldValue,
  GeoPoint,
  getFirestore,
  PartialWithFieldValue,
  Timestamp,
  WithFieldValue,
} from "firebase-admin/firestore";
import { app } from "./app.js";

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

export type QuizAppType = {
  name: string;
  description: string;
  language: string;
  questions: QuestionAppType[];
  author: {
    uid: string;
    name: string;
  };
  isPrivate: boolean;
  createdAt?: Date;
};

type QuizDbType = {
  name: string;
  description: string;
  language: string;
  questions: QuestionDbType[];
  author: {
    uid: string;
    name: string;
  };
  isPrivate: boolean;
  createdAt?: Timestamp;
};

export function convertQuestionToDb(question: QuestionAppType): QuestionDbType {
  return {
    ...question,
    geometry: {
      ...question.geometry,
      coordinates:
        question.geometry.coordinates[0]?.map(
          (coords) => new GeoPoint(coords[1], coords[0]),
        ) ?? [],
    },
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

const converter: FirebaseFirestore.FirestoreDataConverter<QuizAppType> = {
  toFirestore(
    quiz: PartialWithFieldValue<QuizAppType>,
  ): WithFieldValue<QuizDbType> | PartialWithFieldValue<QuizDbType> {
    const { createdAt, questions } = quiz;

    const newQuestions = Array.isArray(questions)
      ? questions
          .map((question) => {
            if (!question || question instanceof FieldValue) {
              return undefined;
            }

            if (!question.geometry || question.geometry instanceof FieldValue) {
              return undefined;
            }

            return {
              ...question,
              geometry: {
                ...question.geometry,
                coordinates:
                  question.geometry.coordinates instanceof FieldValue
                    ? question.geometry.coordinates
                    : !question.geometry.coordinates?.[0] ||
                        question.geometry.coordinates[0] instanceof FieldValue
                      ? undefined
                      : (question.geometry.coordinates[0]?.map(mapToGeopoint) ??
                        []),
              },
            };
          })
          .filter((question) => question !== undefined)
      : (questions ?? []);

    const dbModel = {
      ...quiz,
      createdAt:
        createdAt instanceof Date ? Timestamp.fromDate(createdAt) : createdAt,
      questions: newQuestions,
    };

    return dbModel;
  },
  fromFirestore(
    snapshot: FirebaseFirestore.QueryDocumentSnapshot<QuizDbType>,
  ): QuizAppType {
    const data = snapshot.data();
    return {
      name: data.name,
      description: data.description,
      language: data.language,
      questions: data.questions.map((question) => ({
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
      })),
      author: data.author,
      isPrivate: data.isPrivate,
      createdAt: data.createdAt?.toDate(),
    };
  },
};

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

export const quizzes = getFirestore(app)
  .collection("quizzes")
  .withConverter<QuizAppType, QuizDbType>(converter);
