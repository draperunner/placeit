import firebase from "firebase";

export interface Quiz {
  id: string;
  description: string;
  name: string;
  questions: Array<{
    id: string;
    text: string;
  }>;
}

export interface QuizSession {
  id: string;
  quizDetails: {
    name: string;
    description: string;
    numberOfQuestions: number;
  };
  map: {
    url: string;
    attribution: string;
  };
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
    givenAnswers?: Array<{
      questionId: string;
      participantId: string;
      answer: firebase.firestore.GeoPoint;
      distance: number;
      timestamp: firebase.firestore.Timestamp;
    }>;
    deadline?: firebase.firestore.Timestamp;
  };
  results: Array<{
    participantId: string;
    distance: number;
    name: string;
  }>;
}

export interface User {
  uid: string;
}
