import { onDocumentUpdated } from "firebase-functions/v2/firestore";

import { ANSWER_TIME_LIMIT } from "./constants.js";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { db } from "./models/db.js";
import { QuizSessionDbType } from "./models/quizSessions.js";

function getDeadline(answerTimeLimit = ANSWER_TIME_LIMIT): Timestamp {
  const deadline = new Date().getTime() + answerTimeLimit * 1000;
  return Timestamp.fromMillis(deadline);
}

async function startSession(
  newValue: QuizSessionDbType,
  id: string,
): Promise<void> {
  const firestore = getFirestore();
  const quizId = newValue.quizDetails.id;
  const quizSnapshot = await db.quizzes.doc(quizId).get();
  const quiz = quizSnapshot.data();

  if (!quiz) {
    console.log("Quiz does not exist");
    return;
  }

  const firstQuestion = quiz.questions[0];

  const batch = firestore.batch();

  batch.set(db.quizStates.doc(id), {
    quiz: quizId,
    givenAnswers: [],
    currentCorrectAnswer: firstQuestion,
  });

  batch.update(db.quizSessions.doc(id), {
    startedAt: FieldValue.serverTimestamp(),
    currentQuestion: {
      id: firstQuestion.id,
      text: firstQuestion.properties.text,
      deadline: getDeadline(newValue.answerTimeLimit),
    },
  });

  await batch.commit();
}

export const onSessionChange2ndGen = onDocumentUpdated(
  {
    document: "quiz-sessions/{id}",
    region: "europe-west1",
  },
  async ({ data, params }) => {
    const newValue = data?.after.data() as QuizSessionDbType | undefined;
    const previousValue = data?.before.data() as QuizSessionDbType | undefined;

    if (!newValue || !previousValue) {
      console.log("Either newValue or previousValue is undefined");
      return;
    }

    if (previousValue.state === "lobby" && newValue.state === "in-progress") {
      return startSession(newValue, params.id);
    }
  },
);
