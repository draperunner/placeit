import * as admin from "firebase-admin";

export interface Quiz {
  name: string;
  questions: Array<{
    id: string;
    text: string;
    correctAnswer: admin.firestore.GeoPoint;
  }>;
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
