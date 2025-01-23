import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import express, { Request, Response, NextFunction } from "express";

import cors from "./cors";
import { verifyToken } from "./auth";
import { setGlobalOptions } from "firebase-functions/v2";

const app = express();
app.use(cors);

const db = admin.firestore();

setGlobalOptions({
  region: "europe-west1",
});

enum Collections {
  QUIZZES = "quizzes",
  QUIZ_SESSIONS = "quiz-sessions",
  QUIZ_STATES = "quiz-states",
}

app.post(
  "/",
  verifyToken({ forbidAnonymous: true }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body) {
        throw new Error("Invalid body");
      }

      const { name, description, questions, language, isPrivate } = req.body;

      // @ts-ignore
      const { uid, displayName } = req.user;

      if (typeof name !== "string") {
        throw new Error("`name` is not string");
      }

      if (!Array.isArray(questions) || !questions.length) {
        throw new Error("No questions passed. A quiz needs its questions.");
      }

      const ref = await db.collection(Collections.QUIZZES).add({
        name,
        description,
        language,
        questions: questions.map((question, index) => ({
          ...question,
          id: `${index}`,
        })),
        author: {
          uid,
          name: displayName,
        },
        isPrivate,
      });

      const createdQuiz = await db
        .collection(Collections.QUIZZES)
        .doc(ref.id)
        .get();

      res.status(201).json({
        quiz: createdQuiz.data(),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.use("*", (req, res) => {
  res.status(404).json({ message: "Not Found" });
});

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ message: error.message });
});

export const quizzes2ndGen = onRequest({ maxInstances: 1 }, app);
