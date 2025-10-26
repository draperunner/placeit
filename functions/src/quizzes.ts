import { onRequest } from "firebase-functions/v2/https";
import express, { Request, Response, NextFunction } from "express";

import cors from "./cors.js";
import { getUserContext, verifyToken } from "./auth.js";
import { FieldValue } from "firebase-admin/firestore";
import z from "zod";
import { quizzes } from "./models/db.js";
import { QuestionId } from "./models/ids.js";

const app = express();
app.use(cors);

const QuizSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  questions: z
    .array(
      z.object({
        geometry: z.object({
          type: z.literal("Polygon"),
          coordinates: z.array(
            z
              .array(
                z.tuple([
                  z.number().min(-180).max(180),
                  z.number().min(-90).max(90),
                ]),
              )
              .min(3),
          ),
        }),
        properties: z.object({
          text: z.string().min(1),
        }),
      }),
    )
    .min(1),
  language: z.string().min(2).max(2),
  isPrivate: z.boolean().default(false),
});

app.post(
  "/",
  verifyToken({ forbidAnonymous: true }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, questions, language, isPrivate } =
        QuizSchema.parse(req.body);

      const { uid, displayName } = getUserContext();

      const convertedQuestions = questions.map((question, index) => ({
        ...question,
        id: `${index}` as QuestionId,
        type: "Feature" as const,
      }));

      const ref = await quizzes.add({
        name,
        description,
        language,
        questions: convertedQuestions,
        author: {
          uid,
          name: displayName ?? "Unknown",
        },
        isPrivate,
        createdAt: FieldValue.serverTimestamp(),
      });

      const createdQuiz = await quizzes.doc(ref.id).get();

      res.status(201).json({
        quiz: createdQuiz.data(),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.use("/{*splat}", (req, res) => {
  res.status(404).json({ message: "Not Found" });
});

app.use((error: Error, req: Request, res: Response) => {
  res.status(500).json({ message: error.message });
});

export const quizzes2ndGen = onRequest(
  {
    maxInstances: 1,
    region: "europe-west1",
  },
  app,
);
