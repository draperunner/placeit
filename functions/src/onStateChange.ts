import { onDocumentUpdated } from "firebase-functions/v2/firestore";

import { QuizSession, QuizState } from "./interfaces.js";
import {
  getFirestore,
  Transaction,
  UpdateData,
} from "firebase-admin/firestore";

enum Collections {
  QUIZZES = "quizzes",
  QUIZ_SESSIONS = "quiz-sessions",
  QUIZ_STATES = "quiz-states",
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

async function revealAnswerIfQuestionDeadlinePassed(
  quizState: QuizState,
  id: string,
) {
  const db = getFirestore();

  await db.runTransaction(async (transaction) => {
    const quizSession = await getQuizSession(id, transaction);

    if (!quizSession) {
      throw new Error("Quiz session does not exist");
    }

    const { currentCorrectAnswer, givenAnswers } = quizState;
    const { state, currentQuestion, participants } = quizSession;

    // Reveal final results if game is over
    if (state === "over") {
      const results = participants
        .map((participant) => {
          const totalPoints = givenAnswers
            .filter(({ participantId }) => participantId === participant.uid)
            .map((answer) => answer.points)
            .reduce((a, b) => a + b, 0);

          return {
            name: participant.name,
            participantId: participant.uid,
            points: totalPoints,
          };
        })
        .sort((a, b) => b.points - a.points);

      transaction.update(db.collection(Collections.QUIZ_SESSIONS).doc(id), {
        results,
      } satisfies UpdateData<QuizSession>);

      return;
    }

    if (state !== "in-progress") {
      return;
    }

    if (!currentQuestion) {
      throw new Error(
        "Current question is undefined, although quiz has started.",
      );
    }

    // Deadline has not yet passed, not revealing answer yet.
    if (currentQuestion.deadline.toMillis() >= Date.now()) {
      return;
    }

    const givenAnswersForThisQuestion = givenAnswers.filter(
      ({ questionId }) => questionId === currentQuestion.id,
    );

    transaction.update(db.collection(Collections.QUIZ_SESSIONS).doc(id), {
      "currentQuestion.correctAnswer": currentCorrectAnswer,
      "currentQuestion.givenAnswers": givenAnswersForThisQuestion,
    } satisfies UpdateData<QuizSession>);
  });
}

export const onStateChange2ndGen = onDocumentUpdated(
  {
    document: "quiz-states/{id}",
    region: "europe-west1",
  },
  async ({ data, params }) => {
    const newValue = data?.after.data() as QuizState | undefined;
    const previousValue = data?.before.data() as QuizState | undefined;

    if (!newValue || !previousValue) {
      console.log("Either newValue or previousValue is undefined");
      return;
    }

    await revealAnswerIfQuestionDeadlinePassed(newValue, params.id);
  },
);
