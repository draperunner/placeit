import {
  getFirestore,
  PartialWithFieldValue,
  Timestamp,
  WithFieldValue,
} from "firebase-admin/firestore";
import { app } from "./app.js";
import {
  convertQuestionFromDb,
  convertQuestionToDb,
  QuestionAppType,
  QuestionDbType,
} from "./questions.js";

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

export type QuizDbType = {
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

const converter: FirebaseFirestore.FirestoreDataConverter<QuizAppType> = {
  toFirestore(
    quiz: PartialWithFieldValue<QuizAppType>,
  ): WithFieldValue<QuizDbType> | PartialWithFieldValue<QuizDbType> {
    const { createdAt, questions } = quiz;

    const newQuestions = Array.isArray(questions)
      ? questions
          .map((question) =>
            question ? convertQuestionToDb(question) : undefined,
          )
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
      questions: data.questions.map(convertQuestionFromDb),
      author: data.author,
      isPrivate: data.isPrivate,
      createdAt: data.createdAt?.toDate(),
    };
  },
};

export const quizzes = getFirestore(app)
  .collection("quizzes")
  .withConverter<QuizAppType, QuizDbType>(converter);
