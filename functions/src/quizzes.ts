import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import { Quiz } from "./interfaces";

import { verifyToken } from "./auth";

const app = express();

app.use(cors());

const db = admin.firestore();

enum Collections {
  QUIZZES = "quizzes",
  QUIZ_SESSIONS = "quiz-sessions",
  QUIZ_STATES = "quiz-states",
}

app.get(
  "/",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("Get quizzes  ");

      const snapshot = await db.collection(Collections.QUIZZES).get();

      const allQuizzes: Array<Quiz & { id: string }> = [];

      snapshot.forEach((doc) => {
        const quiz = doc.data() as Quiz;
        console.log(doc.id, quiz);

        allQuizzes.push({ ...quiz, id: doc.id });
      });

      const sensoredQuizzes = allQuizzes.map((quiz) => ({
        ...quiz,
        questions: quiz.questions.map((question) => ({
          ...question,
          correctAnswer: undefined,
        })),
      }));

      res.json({
        quizzes: sensoredQuizzes,
      });
    } catch (error) {
      next(error);
    }
  }
);

app.use("*", (req, res) => {
  res.status(404).json({ message: "Not Found" });
});

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ message: error.message });
});

export const quizzes = functions.region("europe-west1").https.onRequest(app);
