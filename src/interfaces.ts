import type { GeoPoint, Timestamp } from "firebase/firestore";

export interface Quiz {
  id: string;
  description: string;
  name: string;
  language: string;
  isPrivate: boolean;
  questions: Array<{
    id: string;
    text: string;
  }>;
  author: {
    uid: string;
    name: string;
  };
  createdAt?: Timestamp;
}

interface MapData {
  id: "STANDARD" | "NO_LABELS" | "NO_LABELS_NO_BORDERS";
  name: string;
  author: string;
  url: string;
  attribution: string;
}

export interface GivenAnswer {
  questionId: string;
  participantId: string;
  answer: GeoPoint;
  distance: number;
  points: number;
  timestamp: Timestamp;
}

export interface QuizSession {
  id: string;
  quizDetails: {
    name: string;
    description: string;
    language: string;
    numberOfQuestions: number;
    author: {
      uid: string;
      name: string;
    };
  };
  map: MapData;
  answerTimeLimit: number;
  host: {
    uid: string;
    name: string;
  };
  participants: Array<{
    uid: string;
    name: string;
  }>;
  state: "lobby" | "in-progress" | "over";
  currentQuestion?: {
    id: string;
    text: string;
    correctAnswer?: {
      latitude: number;
      longitude: number;
    };
    givenAnswers?: GivenAnswer[];
    deadline?: Timestamp;
  };
  results?: Array<{
    participantId: string;
    points: number;
    name: string;
  }>;
}
