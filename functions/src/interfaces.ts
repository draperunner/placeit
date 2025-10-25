import type { GeoPoint, Timestamp } from "firebase-admin/firestore";
import { QuestionDbType } from "./models/questions.js";

export interface QuizSession {
  host: {
    uid: string;
    name: string;
  };
  participants: Array<{
    uid: string;
    name: string;
  }>;
  state: "lobby" | "in-progress" | "over";
  answerTimeLimit: number;
  currentQuestion: null | {
    id: string;
    text: string;
    correctAnswer?: QuestionDbType | null;
    givenAnswers?: Array<{
      questionId: string;
      participantId: string;
      answer: GeoPoint;
      distance: number;
    }>;
    deadline: Timestamp;
  };
  results?: Array<{
    participantId: string;
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
    id: string;
    name: string;
    description: string;
    numberOfQuestions: number;
    language: string;
  };
}
