import { onDocumentUpdated } from "firebase-functions/v2/firestore";

import { QuizSession, QuizState } from "./interfaces.js";
import { getFirestore, Transaction } from "firebase-admin/firestore";

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

async function checkIfAllAnswersGiven(quizState: QuizState, id: string) {
  const db = getFirestore();

  await db.runTransaction(async (transaction) => {
    const quizSession = await getQuizSession(id, transaction);

    if (!quizSession) {
      throw new Error("Quiz session does not exist");
    }

    const { currentQuestion } = quizSession;

    if (!currentQuestion) {
      throw new Error(
        "Current question is undefined, although quiz has started.",
      );
    }

    const { givenAnswers } = quizState;

    const givenAnswersForThisQuestion = givenAnswers.filter(
      ({ questionId }) => questionId === currentQuestion.id,
    );

    const participantsThatHaveAnswered = givenAnswersForThisQuestion.map(
      ({ participantId }) => participantId,
    );

    const haveAllParticipantsAnswered = quizSession.participants.every(
      (participant) => participantsThatHaveAnswered.includes(participant.uid),
    );

    if (!haveAllParticipantsAnswered) {
      console.log("Not all participants have answered yet.");
      return;
    }

    const gameOver =
      quizSession.quizDetails.numberOfQuestions ===
      Number.parseInt(currentQuestion.id) + 1;

    transaction.update(db.collection(Collections.QUIZ_SESSIONS).doc(id), {
      "currentQuestion.correctAnswer":
        quizState.currentCorrectAnswer.correctAnswer,
      "currentQuestion.givenAnswers": givenAnswersForThisQuestion,
      state: gameOver ? "over" : "in-progress",
      results: quizSession.participants
        .map((parti) => {
          const distance = givenAnswers
            .filter(({ participantId }) => participantId === parti.uid)
            .map((gans) => gans.distance || 0)
            .reduce((a, b) => a + b, 0);

          return {
            name: parti.name,
            participantId: parti.uid,
            distance,
          };
        })
        .sort((a, b) => a.distance - b.distance),
    });
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

    if (newValue.givenAnswers.length === previousValue.givenAnswers.length) {
      console.log("Same number of given answers.");
      return;
    }

    await checkIfAllAnswersGiven(newValue, params.id);
  },
);
