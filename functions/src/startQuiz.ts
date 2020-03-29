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

function getDeadline(): admin.firestore.Timestamp {
  const deadline = new Date().getTime() + ANSWER_TIME_LIMIT;
  return admin.firestore.Timestamp.fromMillis(deadline);
}

export const startQuiz = functions
  .region("europe-west1")
  .firestore.document("quiz-sessions/{id}")
  .onUpdate(async (change, context) => {
    const newValue = change.after.data() as QuizSession;
    const previousValue = change.before.data() as QuizSession;

    if (!newValue || !previousValue) {
      console.log("Either newValue or previousValue is undefined");
      return;
    }

    if (previousValue.state !== "lobby" || newValue.state !== "in-progress") {
      console.log("Not the change we are looking for...");
      return;
    }

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
      .doc(context.params.id)
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
      .doc(context.params.id)
      .update({
        startedAt: now,
        currentQuestion: {
          id: firstQuestion.id,
          text: firstQuestion.text,
          deadline: getDeadline(),
        },
      });
  });
