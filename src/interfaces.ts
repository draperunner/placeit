import firebase from "firebase";

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
}

interface MapData {
  name: string;
  author: string;
  url: string;
  attribution: string;
}

export interface GivenAnswer {
  questionId: string;
  participantId: string;
  answer: firebase.firestore.GeoPoint;
  distance: number;
  timestamp: firebase.firestore.Timestamp;
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
    deadline?: firebase.firestore.Timestamp;
  };
  results: Array<{
    participantId: string;
    distance: number;
    name: string;
  }>;
}

export type User = firebase.User;
