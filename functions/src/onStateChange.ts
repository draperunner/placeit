import { onDocumentUpdated } from "firebase-functions/v2/firestore";

import { getFirestore, Transaction } from "firebase-admin/firestore";
import { QuizStateDbType } from "./models/quizStates.js";
import { quizSessions } from "./models/db.js";
import { QuizSessionAppType } from "./models/quizSessions.js";

async function getQuizSession(
  id: string,
  transaction?: Transaction,
): Promise<QuizSessionAppType | null> {
  const ref = quizSessions.doc(id);
  const doc = transaction ? await transaction.get(ref) : await ref.get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() ?? null;
}

async function revealAnswerIfQuestionDeadlinePassed(
  quizState: QuizStateDbType,
  id: string,
) {
  const firestore = getFirestore();

  await firestore.runTransaction(async (transaction) => {
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

      transaction.update(quizSessions.doc(id), {
        results,
      });

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
    if (currentQuestion.deadline.getTime() >= Date.now()) {
      return;
    }

    const givenAnswersForThisQuestion = givenAnswers.filter(
      ({ questionId }) => questionId === currentQuestion.id,
    );

    transaction.update(quizSessions.doc(id), {
      "currentQuestion.correctAnswer": currentCorrectAnswer,
      "currentQuestion.givenAnswers": givenAnswersForThisQuestion,
    });
  });
}

export const onStateChange2ndGen = onDocumentUpdated(
  {
    document: "quiz-states/{id}",
    region: "europe-west1",
  },
  async ({ data, params }) => {
    const newValue = data?.after.data() as QuizStateDbType | undefined;
    const previousValue = data?.before.data() as QuizStateDbType | undefined;

    if (!newValue || !previousValue) {
      console.log("Either newValue or previousValue is undefined");
      return;
    }

    await revealAnswerIfQuestionDeadlinePassed(newValue, params.id);
  },
);
