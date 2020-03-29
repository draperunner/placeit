import * as admin from "firebase-admin";

export interface Quiz {
  name: string;
  description: string;
  language: string;
  questions: Array<{
    id: string;
    text: string;
    correctAnswer: admin.firestore.GeoPoint;
  }>;
  author: {
    uid: string;
  };
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
  currentQuestion: null | {
    id: string;
    text: string;
    correctAnswer?: admin.firestore.GeoPoint;
    givenAnswers?: Array<{
      questionId: string;
      participantId: string;
      answer: admin.firestore.GeoPoint;
      distance: number;
    }>;
  };
  results: Array<{
    participantId: string;
    distance: number;
    name: string;
  }>;
  createdAt: admin.firestore.Timestamp;
  startedAt: admin.firestore.Timestamp;
  map: {
    url: string;
    attribution: string;
  };
  quizDetails: {
    id: string;
    name: string;
    description: string;
    numberOfQuestions: number;
  };
}

export interface QuizState {
  quiz: string;
  currentCorrectAnswer: {
    questionId: string;
    correctAnswer: admin.firestore.GeoPoint;
  };
  givenAnswers: Array<{
    questionId: string;
    participantId: string;
    answer: admin.firestore.GeoPoint;
    distance: number;
  }>;
}
