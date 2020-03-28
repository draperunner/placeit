import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import haversine from "haversine";

import { Quiz, QuizSession, QuizState } from "./interfaces";
import { verifyToken } from "./auth";

const app = express();

const db = admin.firestore();

enum Collections {
  QUIZZES = "quizzes",
  QUIZ_SESSIONS = "quiz-sessions",
  QUIZ_STATES = "quiz-states",
}

enum Map {
  STANDARD = "STANDARD",
  NO_LABELS = "NO_LABELS",
}

function getMapUrl(map: string): string {
  switch (map) {
    case Map.NO_LABELS:
      return "http://{s}.tiles.wmflabs.org/osm-no-labels/{z}/{x}/{y}.png";
    case Map.STANDARD:
    default:
      return "https://{s}.tile.osm.org/{z}/{x}/{y}.png";
  }
}

app.use(cors());

async function getQuizSession(id: string): Promise<QuizSession | null> {
  const doc = await db.collection("quiz-sessions").doc(id).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as QuizSession;
}

async function getQuizState(id: string): Promise<QuizState | null> {
  const doc = await db.collection("quiz-states").doc(id).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as QuizState;
}

function calculateDistance(
  correctAnswer: admin.firestore.GeoPoint,
  givenAnswer: { latitude: number; longitude: number }
): number {
  return haversine(
    {
      latitude: correctAnswer.latitude,
      longitude: correctAnswer.longitude,
    },
    givenAnswer,
    { unit: "meter" }
  );
}

const ANSWER_TIME_LIMIT = 15 * 1000;

function getDeadline(): admin.firestore.Timestamp {
  const deadline = new Date().getTime() + ANSWER_TIME_LIMIT;
  return admin.firestore.Timestamp.fromMillis(deadline);
}

app.post("/:id/answer", verifyToken, async (req, res, next) => {
  try {
    const now = new Date();
    const id = req.params.id;

    // @ts-ignore
    const currentUserUid = req.user.uid;

    if (!req.body || !req.body.latitude || !req.body.longitude) {
      throw new Error("There are no coordinates in body");
    }

    const quizSession = await getQuizSession(id);

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
        "Current question is undefined, although quiz has started."
      );
    }

    const quizState = await getQuizState(id);

    if (!quizState) {
      throw new Error("Quiz state does not exist");
    }

    const { givenAnswers } = quizState;

    const givenAnswersForThisQuestion = givenAnswers.filter(
      ({ questionId }) => questionId === currentQuestion.id
    );

    const participantsThatHaveAnswered = givenAnswersForThisQuestion.map(
      ({ participantId }) => participantId
    );

    if (participantsThatHaveAnswered.includes(currentUserUid)) {
      throw new Error("User has already answered this question!");
    }

    if (quizState.currentCorrectAnswer.questionId !== currentQuestion.id) {
      throw new Error(
        "The quiz state current answer is not for the current question"
      );
    }

    const distance = calculateDistance(
      quizState.currentCorrectAnswer.correctAnswer,
      req.body
    );

    const givenAnswer = {
      questionId: currentQuestion.id,
      participantId: currentUserUid,
      answer: req.body,
      distance,
      timestamp: admin.firestore.Timestamp.fromDate(now),
    };

    db.collection(Collections.QUIZ_STATES)
      .doc(id)
      .update({
        givenAnswers: admin.firestore.FieldValue.arrayUnion(givenAnswer),
      });

    const haveAllParticipantsAnswered = quizSession.participants.every(
      (participant) => {
        return (
          participant.uid === currentUserUid ||
          // participant.uid === quizSession.host.uid ||
          participantsThatHaveAnswered.includes(participant.uid)
        );
      }
    );

    if (haveAllParticipantsAnswered) {
      db.collection(Collections.QUIZ_SESSIONS)
        .doc(id)
        .update({
          "currentQuestion.correctAnswer":
            quizState.currentCorrectAnswer.correctAnswer,
          "currentQuestion.givenAnswers": [
            ...givenAnswersForThisQuestion,
            givenAnswer,
          ],
          results: quizSession.participants
            .map((parti) => {
              let distanceForThisQuestion = 0;

              if (currentUserUid === parti.uid) {
                distanceForThisQuestion = distance;
              } else {
                distanceForThisQuestion =
                  givenAnswersForThisQuestion.find(
                    ({ participantId }) => participantId === parti.uid
                  )?.distance || 0;
              }

              const accumulatedDistance = givenAnswers
                .filter(({ questionId }) => questionId !== currentQuestion.id)
                .filter(({ participantId }) => participantId === parti.uid)
                .map((gans) => gans.distance || 0)
                .reduce((a, b) => a + b, 0);

              return {
                name: parti.name,
                participantId: parti.uid,
                distance: accumulatedDistance + distanceForThisQuestion,
              };
            })
            .sort((a, b) => a.distance - b.distance),
        });
    }
    res.json({});
  } catch (error) {
    next(error);
  }
});

app.post("/:id/next-question", verifyToken, async (req, res, next) => {
  try {
    const id = req.params.id;

    // @ts-ignore
    const currentUserUid = req.user.uid;

    const quizSession = await getQuizSession(id);

    if (!quizSession) {
      throw new Error("Quiz session does not exist");
    }

    if (!quizSession.host.uid === currentUserUid) {
      throw new Error("Only the host can go to next question");
    }

    // Slottsquizzen
    const quizRef = await db
      .collection(Collections.QUIZZES)
      .doc(quizSession.quizDetails.id)
      .get();

    const quiz = quizRef.data() as Quiz;

    if (!quiz) {
      console.log("Quiz does not exist");
      return;
    }

    const currentQuestionId = quizSession.currentQuestion?.id || -1;
    const currentQuestionIndex = quiz.questions.findIndex(
      (question) => question.id === currentQuestionId
    );

    if (
      currentQuestionIndex < 0 ||
      currentQuestionIndex === quiz.questions.length - 1
    ) {
      throw new Error(
        "There are no more questions. We should be done already."
      );
    }

    const nextQuestion = quiz.questions[currentQuestionIndex + 1];

    db.collection(Collections.QUIZ_STATES)
      .doc(id)
      .update({
        currentCorrectAnswer: {
          questionId: nextQuestion.id,
          correctAnswer: nextQuestion.correctAnswer,
        },
      });

    db.collection(Collections.QUIZ_SESSIONS)
      .doc(id)
      .update({
        currentQuestion: {
          id: nextQuestion.id,
          text: nextQuestion.text,
          deadline: getDeadline(),
        },
      });

    res.json({});
  } catch (error) {
    next(error);
  }
});

app.post("/", verifyToken, async (req, res, next) => {
  try {
    const { hostName, quizId, map } = req.body;

    if (!hostName || typeof hostName !== "string") {
      throw new Error("`hostName` is invalid.");
    }

    if (!map || typeof map !== "string") {
      throw new Error("`map` is invalid.");
    }

    // @ts-ignore
    const uid = req.user.uid;

    const quizRef = await db.collection(Collections.QUIZZES).doc(quizId).get();

    if (!quizRef || !quizRef.exists) {
      throw new Error("Could not find quiz with this ID.");
    }

    const quiz = quizRef.data() as Quiz;

    if (!quiz) {
      throw new Error("Could not find quiz with this ID.");
    }

    const quizDetails = {
      id: quizId,
      name: quiz.name,
      description: quiz.description,
      numberOfQuestions: quiz.questions.length,
    };

    const docRef = await db.collection("quiz-sessions").add({
      host: {
        uid,
        name: hostName,
      },
      quizDetails,
      participants: [],
      state: "lobby",
      map: getMapUrl(map),
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

app.use("*", (req, res) => {
  res.status(404).json({ message: "Not Found" });
});

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ message: error.message });
});

export const sessions = functions.region("europe-west1").https.onRequest(app);
