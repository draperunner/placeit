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
import { QuestionId, QuizId, UserId } from "./ids.js";

export type QuizSessionAppType = {
  host: {
    uid: UserId;
    name: string;
  };
  participants: Array<{
    uid: UserId;
    name: string;
  }>;
  state: "lobby" | "in-progress" | "over";
  answerTimeLimit: number;
  currentQuestion: null | {
    id: QuestionId;
    index: number;
    text: string;
    correctAnswer?: QuestionAppType | null;
    givenAnswers?: GivenAnswerAppType[];
    deadline: Date;
  };
  results?: Array<{
    participantId: UserId;
    points: number;
    name: string;
  }>;
  createdAt: Date;
  startedAt: Date | null;
  map: {
    id: "STANDARD" | "NO_LABELS" | "NO_LABELS_NO_BORDERS";
    url: string;
    name: string;
    author: string;
  };
  quizDetails: {
    id: QuizId;
    name: string;
    description: string;
    numberOfQuestions: number;
    language: string;
  };
};

export type QuizSessionDbType = {
  host: {
    uid: UserId;
    name: string;
  };
  participants: Array<{
    uid: UserId;
    name: string;
  }>;
  state: "lobby" | "in-progress" | "over";
  answerTimeLimit: number;
  currentQuestion: null | {
    id: QuestionId;
    index: number;
    text: string;
    correctAnswer?: QuestionDbType | null;
    givenAnswers?: Array<GivenAnswerDbType>;
    deadline: Timestamp;
  };
  results?: Array<{
    participantId: UserId;
    points: number;
    name: string;
  }>;
  createdAt: Timestamp;
  startedAt: Timestamp | null;
  map: {
    id: "STANDARD" | "NO_LABELS" | "NO_LABELS_NO_BORDERS";
    url: string;
    name: string;
    author: string;
  };
  quizDetails: {
    id: QuizId;
    name: string;
    description: string;
    numberOfQuestions: number;
    language: string;
  };
};

const converter: FirebaseFirestore.FirestoreDataConverter<QuizSessionAppType> =
  {
    toFirestore(
      quizSession: PartialWithFieldValue<QuizSessionAppType>,
    ):
      | WithFieldValue<QuizSessionDbType>
      | PartialWithFieldValue<QuizSessionDbType> {
      return {
        ...quizSession,
        createdAt:
          quizSession.createdAt instanceof Date
            ? Timestamp.fromDate(quizSession.createdAt)
            : quizSession.createdAt,
        startedAt:
          quizSession.startedAt instanceof Date
            ? Timestamp.fromDate(quizSession.startedAt)
            : quizSession.startedAt,
        currentQuestion: isActual(quizSession.currentQuestion)
          ? {
              ...quizSession.currentQuestion,
              deadline:
                quizSession.currentQuestion.deadline instanceof Date
                  ? Timestamp.fromDate(quizSession.currentQuestion.deadline)
                  : quizSession.currentQuestion.deadline,
              correctAnswer: isActual(quizSession.currentQuestion.correctAnswer)
                ? convertQuestionToDb(quizSession.currentQuestion.correctAnswer)
                : quizSession.currentQuestion.correctAnswer,
              givenAnswers: isActual(quizSession.currentQuestion.givenAnswers)
                ? quizSession.currentQuestion.givenAnswers
                    .map((ga) => (ga ? convertGivenAnswerToDb(ga) : undefined))
                    .filter((ga) => ga !== undefined)
                : undefined,
            }
          : null,
      };
    },
    fromFirestore(
      snapshot: FirebaseFirestore.QueryDocumentSnapshot<QuizSessionDbType>,
    ): QuizSessionAppType {
      const quizSession = snapshot.data();
      return {
        ...quizSession,
        createdAt: quizSession.createdAt.toDate(),
        startedAt: quizSession.startedAt?.toDate() || null,
        currentQuestion: quizSession.currentQuestion
          ? {
              ...quizSession.currentQuestion,
              deadline: quizSession.currentQuestion.deadline.toDate(),
              correctAnswer: quizSession.currentQuestion.correctAnswer
                ? convertQuestionFromDb(
                    quizSession.currentQuestion.correctAnswer,
                  )
                : null,
              givenAnswers: quizSession.currentQuestion.givenAnswers
                ? quizSession.currentQuestion.givenAnswers.map(
                    convertGivenAnswerFromDb,
                  )
                : undefined,
            }
          : null,
      };
    },
  };

function isActual<T>(value: T | FieldValue | null | undefined): value is T {
  return (
    value !== undefined && value !== null && !(value instanceof FieldValue)
  );
}

export const quizSessions = getFirestore(app)
  .collection("quiz-sessions")
  .withConverter<QuizSessionAppType, QuizSessionDbType>(converter);
