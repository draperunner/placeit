import {
  FieldValue,
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
import {
  convertGivenAnswerFromDb,
  convertGivenAnswerToDb,
  GivenAnswerAppType,
  GivenAnswerDbType,
} from "./givenAnswers.js";

export type QuizStateAppType = {
  quiz: string;
  currentCorrectAnswer: QuestionAppType | null;
  givenAnswers: GivenAnswerAppType[];
  lastPing?: Date;
};

export type QuizStateDbType = {
  quiz: string;
  currentCorrectAnswer: QuestionDbType | null;
  givenAnswers: GivenAnswerDbType[];
  lastPing?: Timestamp;
};

const converter: FirebaseFirestore.FirestoreDataConverter<QuizStateAppType> = {
  toFirestore(
    quizState: PartialWithFieldValue<QuizStateAppType>,
  ): WithFieldValue<QuizStateDbType> | PartialWithFieldValue<QuizStateDbType> {
    return {
      ...quizState,
      currentCorrectAnswer: quizState.currentCorrectAnswer
        ? convertQuestionToDb(quizState.currentCorrectAnswer)
        : quizState.currentCorrectAnswer,
      givenAnswers: isActual(quizState.givenAnswers)
        ? quizState.givenAnswers.map((a) => (a ? convertGivenAnswerToDb(a) : a))
        : quizState.givenAnswers,
      lastPing:
        quizState.lastPing instanceof Date
          ? Timestamp.fromDate(quizState.lastPing)
          : quizState.lastPing,
    };
  },
  fromFirestore(
    snapshot: FirebaseFirestore.QueryDocumentSnapshot<QuizStateDbType>,
  ): QuizStateAppType {
    const data = snapshot.data();
    return {
      quiz: data.quiz,
      currentCorrectAnswer: data.currentCorrectAnswer
        ? convertQuestionFromDb(data.currentCorrectAnswer)
        : null,
      givenAnswers: data.givenAnswers.map(convertGivenAnswerFromDb),
      lastPing: data.lastPing?.toDate(),
    };
  },
};

function isActual<T>(value: T | FieldValue | null | undefined): value is T {
  return (
    value !== undefined && value !== null && !(value instanceof FieldValue)
  );
}

export const quizStates = getFirestore(app)
  .collection("quiz-states")
  .withConverter<QuizStateAppType, QuizStateDbType>(converter);
