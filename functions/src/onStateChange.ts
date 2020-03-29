import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { QuizSession, QuizState } from "./interfaces";

const db = admin.firestore();

enum Collections {
  QUIZZES = "quizzes",
  QUIZ_SESSIONS = "quiz-sessions",
  QUIZ_STATES = "quiz-states",
}

async function getQuizSession(id: string): Promise<QuizSession | null> {
  const doc = await db.collection(Collections.QUIZ_SESSIONS).doc(id).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as QuizSession;
}

async function checkIfAllAnswersGiven(quizState: QuizState, id: string) {
  const quizSession = await getQuizSession(id);

  if (!quizSession) {
    throw new Error("Quiz session does not exist");
  }

  const { currentQuestion } = quizSession;

  if (!currentQuestion) {
    throw new Error(
      "Current question is undefined, although quiz has started."
    );
  }

  const { givenAnswers } = quizState;

  const givenAnswersForThisQuestion = givenAnswers.filter(
    ({ questionId }) => questionId === currentQuestion.id
  );

  const participantsThatHaveAnswered = givenAnswersForThisQuestion.map(
    ({ participantId }) => participantId
  );

  const haveAllParticipantsAnswered = quizSession.participants.every(
    (participant) => participantsThatHaveAnswered.includes(participant.uid)
  );

  if (!haveAllParticipantsAnswered) return;

  const gameOver =
    quizSession.quizDetails.numberOfQuestions ===
    Number.parseInt(currentQuestion.id) + 1;

  db.collection(Collections.QUIZ_SESSIONS)
    .doc(id)
    .update({
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
}

export const onStateChange = functions
  .region("europe-west1")
  .firestore.document("quiz-states/{id}")
  .onUpdate(async (change, context) => {
    const newValue = change.after.data() as QuizState;
    const previousValue = change.before.data() as QuizState;

    if (!newValue || !previousValue) {
      console.log("Either newValue or previousValue is undefined");
      return;
    }

    checkIfAllAnswersGiven(newValue, context.params.id);
  });
