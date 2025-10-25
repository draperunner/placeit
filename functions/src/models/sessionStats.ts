import {
  getFirestore,
  PartialWithFieldValue,
  Timestamp,
  WithFieldValue,
} from "firebase-admin/firestore";
import { app } from "./app.js";

export type SessionStatAppType = {
  quizId: string;
  numberOfParticipants: number;
  numberOfQuestions: number;
  language: string;
  startedAt: Date | null;
  finalState: string;
  map: string;
  answerTimeLimit: number;
};

export type SessionStatDbType = {
  quizId: string;
  numberOfParticipants: number;
  numberOfQuestions: number;
  language: string;
  startedAt: Timestamp | null;
  finalState: string;
  map: string;
  answerTimeLimit: number;
};

const converter: FirebaseFirestore.FirestoreDataConverter<SessionStatAppType> =
  {
    toFirestore(
      quiz: PartialWithFieldValue<SessionStatAppType>,
    ):
      | WithFieldValue<SessionStatDbType>
      | PartialWithFieldValue<SessionStatDbType> {
      return {
        ...quiz,
        startedAt:
          quiz.startedAt instanceof Date
            ? Timestamp.fromDate(quiz.startedAt)
            : quiz.startedAt,
      };
    },
    fromFirestore(
      snapshot: FirebaseFirestore.QueryDocumentSnapshot<SessionStatDbType>,
    ): SessionStatAppType {
      const data = snapshot.data();
      return {
        ...data,
        startedAt:
          data.startedAt instanceof Timestamp
            ? data.startedAt.toDate()
            : data.startedAt,
      };
    },
  };

export const sessionStats = getFirestore(app)
  .collection("session-stats")
  .withConverter<SessionStatAppType, SessionStatDbType>(converter);
