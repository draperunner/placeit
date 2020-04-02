import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { Quiz, QuizSession } from "./interfaces";
import { ANSWER_TIME_LIMIT } from "./constants";

const db = admin.firestore();

enum Collections {
  QUIZZES = "quizzes",
  QUIZ_SESSIONS = "quiz-sessions",
  QUIZ_STATES = "quiz-states",
}

function getDeadline(
  answerTimeLimit = ANSWER_TIME_LIMIT
): admin.firestore.Timestamp {
  const deadline = new Date().getTime() + answerTimeLimit;
  return admin.firestore.Timestamp.fromMillis(deadline);
}

async function startSession(newValue: QuizSession, id: string): Promise<void> {
  const now = admin.firestore.Timestamp.now();

  const quizId = newValue.quizDetails.id;
  const quizRef = await db.collection(Collections.QUIZZES).doc(quizId).get();
  const quiz = quizRef.data() as Quiz;

  if (!quiz) {
    console.log("Quiz does not exist");
    return;
  }

  const firstQuestion = quiz.questions[0];

  db.collection(Collections.QUIZ_STATES)
    .doc(id)
    .set({
      quiz: quizId,
      givenAnswers: [],
      currentCorrectAnswer: {
        questionId: firstQuestion.id,
        correctAnswer: firstQuestion.correctAnswer,
      },
      results: [],
    });

  db.collection(Collections.QUIZ_SESSIONS)
    .doc(id)
    .update({
      startedAt: now,
      currentQuestion: {
        id: firstQuestion.id,
        text: firstQuestion.text,
        deadline: getDeadline(newValue.answerTimeLimit),
      },
    });
}

export const onSessionChange = functions
  .region("europe-west1")
  .firestore.document("quiz-sessions/{id}")
  .onUpdate(async (change, context) => {
    const newValue = change.after.data() as QuizSession;
    const previousValue = change.before.data() as QuizSession;

    if (!newValue || !previousValue) {
      console.log("Either newValue or previousValue is undefined");
      return;
    }

    if (previousValue.state === "lobby" && newValue.state === "in-progress") {
      return startSession(newValue, context.params.id);
    }
  });
