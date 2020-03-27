import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { Quiz } from "./interfaces";

const db = admin.firestore();

enum Collections {
  QUIZZES = "quizzes",
  QUIZ_SESSIONS = "quiz-sessions",
  QUIZ_STATES = "quiz-states",
}

const ANSWER_TIME_LIMIT = 15 * 1000;

function getDeadline(): admin.firestore.Timestamp {
  const deadline = new Date().getTime() + ANSWER_TIME_LIMIT;
  return admin.firestore.Timestamp.fromMillis(deadline);
}

export const startQuiz = functions
  .region("europe-west1")
  .firestore.document("quiz-sessions/{id}")
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();

    if (!newValue || !previousValue) {
      console.log("Either newValue or previousValue is undefined");
      return;
    }

    /**
     * TODO: When host clicks "next", update currentQuestion or finish quiz and add results to session
     */

    if (previousValue.state !== "lobby" || newValue.state !== "in-progress") {
      console.log("Not the change we are looking for...");
      return;
    }

    // Slottsquizzen
    const quizRef = await db
      .collection(Collections.QUIZZES)
      .doc("6Rpw5hUeVFrMYErSQnIb")
      .get();

    const quiz = quizRef.data() as Quiz;

    if (!quiz) {
      console.log("Quiz does not exist");
      return;
    }

    const firstQuestion = quiz.questions[0];

    db.collection(Collections.QUIZ_STATES)
      .doc(context.params.id)
      .set({
        quiz: "quizzes/6Rpw5hUeVFrMYErSQnIb",
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
        currentQuestion: {
          id: firstQuestion.id,
          text: firstQuestion.text,
          deadline: getDeadline(),
        },
      });
  });
