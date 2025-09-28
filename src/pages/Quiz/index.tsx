import { useState, useEffect } from "react";

import firebase from "firebase/app";
import "firebase/firestore";

import { useParams } from "react-router-dom";

import { useUser } from "../../auth";
import { QuizSession } from "../../interfaces";

import Lobby from "./Lobby";
import QuizInProgress from "./QuizInProgress";
import GameOver from "./GameOver";

import "./styles.css";

const db = firebase.firestore();

export default function Quiz() {
  const { id } = useParams<{ id: string }>();
  const user = useUser();

  const [quiz, setQuiz] = useState<QuizSession | undefined>();

  useEffect(() => {
    if (!id || !user) return;
    const unsubscribe = db
      .collection("quiz-sessions")
      .doc(id)
      .onSnapshot((doc) => {
        const quizData = doc.data() as QuizSession | undefined;

        if (!quizData) {
          return;
        }

        setQuiz({ ...quizData, id });
      });
    return unsubscribe;
  }, [id, user]);

  if (!id || !quiz) {
    return (
      <div className="App">
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
