import type { GeoPoint, Timestamp } from "firebase-admin/firestore";

export interface Quiz {
  name: string;
  description: string;
  language: string;
  questions: Array<{
    id: string;
    text: string;
    correctAnswer: GeoPoint;
  }>;
  author: {
    uid: string;
  };
  isPrivate: boolean;
}

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
    correctAnswer?: GeoPoint;
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
  startedAt: Timestamp;
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
  };
}

export interface GivenAnswer {
  questionId: string;
  participantId: string;
  answer: GeoPoint;
  distance: number;
  points: number;
  timestamp: Timestamp;
}

export interface QuizState {
  quiz: string;
  currentCorrectAnswer: {
    questionId: string;
    correctAnswer: GeoPoint;
  };
  givenAnswers: GivenAnswer[];
}
