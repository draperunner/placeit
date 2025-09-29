import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { collection, doc, getFirestore, onSnapshot } from "firebase/firestore";

import { useUser } from "../../auth";
import { QuizSession } from "../../interfaces";

import Lobby from "./Lobby";
import QuizInProgress from "./QuizInProgress";
import GameOver from "./GameOver";

const db = getFirestore();

export default function Quiz() {
  const { id } = useParams<{ id: string }>();
  const user = useUser();

  const [quiz, setQuiz] = useState<QuizSession | undefined>();

  useEffect(() => {
    if (!id || !user) return;
    const unsubscribe = onSnapshot(
      doc(collection(db, "quiz-sessions"), id),
      (doc) => {
        const quizData = doc.data() as QuizSession | undefined;

        if (!quizData) {
          return;
        }

        setQuiz({ ...quizData, id });
      },
    );
    return unsubscribe;
  }, [id, user]);

  if (!id || !quiz) {
    return (
      <div>
        <p>Loading...</p>
      </div>
    );
  }

  if (quiz.state === "lobby") {
    return <Lobby quiz={quiz} user={user} />;
  }

  if (quiz.state === "in-progress") {
    return <QuizInProgress quiz={quiz} user={user} />;
  }

  return <GameOver quiz={quiz} user={user} />;
}
