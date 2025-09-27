import { onDocumentUpdated } from "firebase-functions/v2/firestore";

import { Quiz, QuizSession } from "./interfaces.js";
import { ANSWER_TIME_LIMIT } from "./constants.js";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";

enum Collections {
  QUIZZES = "quizzes",
  QUIZ_SESSIONS = "quiz-sessions",
  QUIZ_STATES = "quiz-states",
}

function getDeadline(answerTimeLimit = ANSWER_TIME_LIMIT): Timestamp {
  const deadline = new Date().getTime() + answerTimeLimit * 1000;
  return Timestamp.fromMillis(deadline);
}

async function startSession(newValue: QuizSession, id: string): Promise<void> {
  const db = getFirestore();
  const quizId = newValue.quizDetails.id;
  const quizRef = await db.collection(Collections.QUIZZES).doc(quizId).get();
  const quiz = quizRef.data() as Quiz | undefined;

  if (!quiz) {
    console.log("Quiz does not exist");
    return;
  }

  const firstQuestion = quiz.questions[0];

  const batch = db.batch();

  batch.set(db.collection(Collections.QUIZ_STATES).doc(id), {
    quiz: quizId,
    givenAnswers: [],
    currentCorrectAnswer: {
      questionId: firstQuestion.id,
      correctAnswer: firstQuestion.correctAnswer,
    },
    results: [],
  });

  batch.update(db.collection(Collections.QUIZ_SESSIONS).doc(id), {
    startedAt: FieldValue.serverTimestamp(),
    currentQuestion: {
      id: firstQuestion.id,
      text: firstQuestion.text,
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
    const newValue = data?.after.data() as QuizSession | undefined;
    const previousValue = data?.before.data() as QuizSession | undefined;

    if (!newValue || !previousValue) {
      console.log("Either newValue or previousValue is undefined");
      return;
    }

    if (previousValue.state === "lobby" && newValue.state === "in-progress") {
      return startSession(newValue, params.id);
    }
  },
);
