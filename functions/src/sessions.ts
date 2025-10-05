import { onRequest } from "firebase-functions/v2/https";
import express, { Request, Response } from "express";
import haversine from "haversine";

import cors from "./cors.js";
import { GivenAnswer, Quiz, QuizSession, QuizState } from "./interfaces.js";
import { getUserContext, verifyToken } from "./auth.js";
import { ANSWER_TIME_LIMIT } from "./constants.js";
import {
  FieldValue,
  GeoPoint,
  getFirestore,
  Timestamp,
  Transaction,
} from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import z from "zod";

const app = express();
app.use(cors);

enum Collections {
  QUIZZES = "quizzes",
  QUIZ_SESSIONS = "quiz-sessions",
  QUIZ_STATES = "quiz-states",
}

enum Map {
  STANDARD = "STANDARD",
  NO_LABELS = "NO_LABELS",
  NO_LABELS_NO_BORDERS = "NO_LABELS_NO_BORDERS",
}

interface MapData {
  id: Map;
  name: string;
  author: string;
  url: string;
}

function getMapData(map: Map): MapData {
  switch (map) {
    case Map.NO_LABELS:
      return {
        id: Map.NO_LABELS,
        name: "Liberty",
        author: "OpenFreeMap",
        url: "/maps/liberty-no-labels.json",
      };
    case Map.NO_LABELS_NO_BORDERS:
      return {
        id: Map.NO_LABELS_NO_BORDERS,
        name: "Liberty",
        author: "OpenFreeMap",
        url: "/maps/liberty-no-labels-no-borders.json",
      };
    case Map.STANDARD:
    default:
      return {
        id: Map.STANDARD,
        name: "Liberty",
        author: "OpenFreeMap",
        url: "https://tiles.openfreemap.org/styles/liberty",
      };
  }
}

function scoreFromDistance(
  distanceMeters: number | null,
  cutoffMeters = 2_000_000,
) {
  if (distanceMeters === null || distanceMeters >= cutoffMeters) {
    return 0;
  }

  if (distanceMeters <= 0) {
    return 1000;
  }

  const HALF_RATIO = 0.075; // Score 500 is given at a distance of 150 km if cutoff 2000 km
  const h = HALF_RATIO * cutoffMeters;
  const k = Math.log(2) / h;

  const tail = Math.exp(-k * cutoffMeters);
  const top = Math.exp(-k * distanceMeters) - tail;
  const denominator = 1 - tail;

  return Math.round((1000 * top) / denominator);
}

async function getQuizSession(
  id: string,
  transaction?: Transaction,
): Promise<QuizSession | null> {
  const db = getFirestore();
  const ref = db.collection("quiz-sessions").doc(id);
  const doc = transaction ? await transaction.get(ref) : await ref.get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as QuizSession;
}

async function getQuizState(
  id: string,
  transaction?: Transaction,
): Promise<QuizState | null> {
  const db = getFirestore();
  const ref = db.collection("quiz-states").doc(id);
  const doc = transaction ? await transaction.get(ref) : await ref.get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as QuizState;
}

function calculateDistance(
  correctAnswer: GeoPoint,
  givenAnswer: { latitude: number; longitude: number },
): number {
  return haversine(
    {
      latitude: correctAnswer.latitude,
      longitude: correctAnswer.longitude,
    },
    givenAnswer,
    { unit: "meter" },
  );
}

function getDeadline(answerTimeLimit = ANSWER_TIME_LIMIT): Timestamp {
  const deadline = new Date().getTime() + answerTimeLimit * 1000;
  return Timestamp.fromMillis(deadline);
}

const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

app.post("/:id/answer", verifyToken(), async (req, res, next) => {
  try {
    const db = getFirestore();
    const now = new Date();
    const id = req.params.id;

    const parsedBody = CoordinatesSchema.parse(req.body);

    const currentUserUid = getUserContext().uid;

    await db.runTransaction(async (transaction) => {
      const [quizSession, quizState] = await Promise.all([
        getQuizSession(id, transaction),
        getQuizState(id, transaction),
      ]);

      if (!quizSession) {
        throw new Error("Quiz session does not exist");
      }

      if (quizSession.state !== "in-progress") {
        throw new Error("Cannot answer in a quiz that has not started.");
      }

      if (!quizSession.participants.some(({ uid }) => uid === currentUserUid)) {
        throw new Error("User is not participating in this quiz session.");
      }

      const { currentQuestion } = quizSession;

      if (!currentQuestion) {
        throw new Error(
          "Current question is undefined, although quiz has started.",
        );
      }

      const diff = currentQuestion.deadline.toMillis() - now.getTime();
      if (diff <= 0) {
        throw new Error(`Answered too late: ${diff} ms`);
      }

      if (!quizState) {
        throw new Error("Quiz state does not exist");
      }

      if (quizState.currentCorrectAnswer.questionId !== currentQuestion.id) {
        throw new Error(
          "The quiz state current answer is not for the current question",
        );
      }

      const distance = calculateDistance(
        quizState.currentCorrectAnswer.correctAnswer,
        parsedBody,
      );

      const points = scoreFromDistance(distance);

      const givenAnswer: GivenAnswer = {
        questionId: currentQuestion.id,
        participantId: currentUserUid,
        answer: new GeoPoint(parsedBody.latitude, parsedBody.longitude),
        distance,
        points,
        timestamp: Timestamp.fromDate(now),
      };

      const updatedGivenAnswers = [
        ...quizState.givenAnswers.filter(
          (ans) =>
            ans.participantId !== currentUserUid ||
            ans.questionId !== currentQuestion.id,
        ),
        givenAnswer,
      ];

      transaction.update(db.collection(Collections.QUIZ_STATES).doc(id), {
        givenAnswers: updatedGivenAnswers,
      });
    });

    res.json({});
  } catch (error) {
    next(error);
  }
});

app.post("/:id/next-question", verifyToken(), async (req, res, next) => {
  try {
    const id = req.params.id;
    const currentUserUid = getUserContext().uid;

    const db = getFirestore();

    await db.runTransaction(async (transaction) => {
      const [quizSession, quizState] = await Promise.all([
        getQuizSession(id, transaction),
        getQuizState(id, transaction),
      ]);

      if (!quizSession) {
        throw new Error("Quiz session does not exist");
      }

      if (!quizState) {
        throw new Error("Quiz state does not exist");
      }

      if (quizSession.host.uid !== currentUserUid) {
        throw new Error("Only the host can go to next question");
      }

      const quizRef = await transaction.get(
        db.collection(Collections.QUIZZES).doc(quizSession.quizDetails.id),
      );

      const quiz = quizRef.data() as Quiz | undefined;

      if (!quiz) {
        throw new Error(
          "This quiz does not exist. A mind-blowing error indeed!",
        );
      }

      const { currentQuestion } = quizSession;

      if (!currentQuestion) {
        throw new Error("Huh. There is no currentQuestion. Strange.");
      }

      const currentQuestionIndex = quiz.questions.findIndex(
        (question) => question.id === currentQuestion.id,
      );

      if (currentQuestionIndex < 0) {
        throw new Error(
          "The current question is not part of this quiz's questions. What?",
        );
      }

      // No more questions left, game should be over
      const gameOver = currentQuestionIndex === quiz.questions.length - 1;

      const nextQuestion = gameOver
        ? null
        : quiz.questions[currentQuestionIndex + 1];

      transaction.update(db.collection(Collections.QUIZ_STATES).doc(id), {
        currentCorrectAnswer: nextQuestion
          ? {
              questionId: nextQuestion.id,
              correctAnswer: nextQuestion.correctAnswer,
            }
          : null,
      });

      transaction.update(db.collection(Collections.QUIZ_SESSIONS).doc(id), {
        state: gameOver ? "over" : "in-progress",
        currentQuestion: nextQuestion
          ? {
              id: nextQuestion.id,
              text: nextQuestion.text,
              deadline: getDeadline(quizSession.answerTimeLimit),
            }
          : null,
      });
    });

    res.json({});
  } catch (error) {
    next(error);
  }
});

const CreateSessionSchema = z.object({
  hostName: z.string().min(1),
  quizId: z.string().min(1),
  map: z.enum(Map),
  hostParticipates: z.boolean().optional(),
  answerTimeLimit: z.number().min(5).max(120).optional(),
});

app.post("/", verifyToken(), async (req, res, next) => {
  try {
    const {
      hostName,
      quizId,
      map,
      hostParticipates,
      answerTimeLimit = ANSWER_TIME_LIMIT,
    } = CreateSessionSchema.parse(req.body);

    const uid = getUserContext().uid;

    const db = getFirestore();
    const quizRef = await db.collection(Collections.QUIZZES).doc(quizId).get();

    if (!quizRef.exists) {
      throw new Error("Could not find quiz with this ID.");
    }

    const quiz = quizRef.data() as Quiz | undefined;

    if (!quiz) {
      throw new Error("Could not find quiz with this ID.");
    }

    const quizAuthor = await getAuth().getUser(quiz.author.uid);

    const quizDetails = {
      id: quizId,
      name: quiz.name,
      description: quiz.description,
      language: quiz.language,
      numberOfQuestions: quiz.questions.length,
      author: {
        uid: quizAuthor.uid,
        name: quizAuthor.displayName,
      },
    };

    const docRef = await db.collection("quiz-sessions").add({
      host: {
        uid,
        name: hostName,
      },
      quizDetails,
      participants: hostParticipates
        ? [
            {
              uid,
              name: hostName,
            },
          ]
        : [],
      state: "lobby",
      map: getMapData(map),
      answerTimeLimit,
    });

    res.status(201).json({
      session: {
        id: docRef.id,
      },
    });
  } catch (error) {
    next(error);
  }
});

const UpdateSessionSchema = z.object({
  map: z.enum(Map).optional(),
  hostParticipates: z.boolean().optional(),
  answerTimeLimit: z.number().min(5).max(120).optional(),
});

app.patch("/:id", verifyToken(), async (req, res, next) => {
  try {
    const { id: sessionId } = req.params;

    const { map, hostParticipates, answerTimeLimit } =
      UpdateSessionSchema.parse(req.body);

    const uid = getUserContext().uid;
    const db = getFirestore();

    const updatedSession = await db.runTransaction(async (transaction) => {
      const session = await getQuizSession(sessionId, transaction);

      if (!session) {
        throw new Error("Could not find session with this ID.");
      }

      if (session.host.uid !== uid) {
        throw new Error("Only the host can update the session.");
      }

      if (session.state !== "lobby") {
        throw new Error("Can only update session while in the lobby.");
      }

      const updates: Partial<QuizSession> = {
        map: map ? getMapData(map) : session.map,
        answerTimeLimit: answerTimeLimit ?? session.answerTimeLimit,
        participants: session.participants,
      };

      if (hostParticipates) {
        if (!session.participants.some(({ uid }) => uid === session.host.uid)) {
          updates.participants = [
            { uid: session.host.uid, name: session.host.name },
            ...session.participants,
          ];
        }
      } else if (hostParticipates === false) {
        updates.participants = session.participants.filter(
          ({ uid }) => uid !== session.host.uid,
        );
      }

      transaction.update(
        db.collection("quiz-sessions").doc(sessionId),
        updates,
      );

      return updates;
    });

    res.status(200).json({
      session: {
        id: sessionId,
        ...updatedSession,
      },
    });
  } catch (error) {
    next(error);
  }
});

const JoinSchema = z.object({
  name: z.string().min(1),
});

app.post("/:id/join", verifyToken(), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { uid } = getUserContext();
    const { name } = JoinSchema.parse(req.body);
    const db = getFirestore();

    await db.runTransaction(async (transaction) => {
      const quizSession = await getQuizSession(id, transaction);

      if (!quizSession) {
        throw new Error("Quiz session does not exist");
      }

      if (quizSession.state !== "lobby") {
        throw new Error("Cannot join a quiz that has already started.");
      }

      if (
        quizSession.participants.some((participant) => participant.uid === uid)
      ) {
        return;
      }

      transaction.update(db.collection("quiz-sessions").doc(id), {
        participants: FieldValue.arrayUnion({
          uid,
          name,
        }),
      });
    });

    res.json({});
  } catch (error) {
    next(error);
  }
});

app.post("/:id/start", verifyToken(), async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getFirestore();

    await db.runTransaction(async (transaction) => {
      const quizSession = await getQuizSession(id, transaction);

      if (!quizSession) {
        throw new Error("Quiz session does not exist");
      }

      if (quizSession.host.uid !== getUserContext().uid) {
        throw new Error("Only the host can start the quiz");
      }

      if (quizSession.state !== "lobby") {
        throw new Error("Quiz has already started");
      }

      transaction.update(db.collection("quiz-sessions").doc(id), {
        state: "in-progress",
      });
    });
    res.json({});
  } catch (error) {
    next(error);
  }
});

app.post("/:id/ping", verifyToken(), async (req, res, next) => {
  try {
    const { id } = req.params;

    await getFirestore().collection(Collections.QUIZ_STATES).doc(id).update({
      lastPing: FieldValue.serverTimestamp(),
    });

    res.json({});
  } catch (error) {
    next(error);
  }
});

app.use("/{*splat}", (req, res) => {
  res.status(404).json({ message: "Not Found" });
});

app.use((error: Error, req: Request, res: Response) => {
  res.status(500).json({ message: error.message });
});

export const sessions2ndGen = onRequest(
  {
    maxInstances: 1,
    region: "europe-west1",
  },
  app,
);
