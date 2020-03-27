import React, { useState, useEffect } from "react";

import firebase from "firebase";
import "firebase/firestore";

import { useParams } from "react-router-dom";

import { useUser } from "../../auth";

import Lobby from "./Lobby";
import QuizInProgress from "./QuizInProgress";

import "./styles.css";

const db = firebase.firestore();

interface Quiz {
  id: string;
  host: {
    uid: string;
    name: string;
  };
  participants: Array<{
    uid: string;
    name: string;
  }>;
  state: "lobby" | "in-progress" | "over";
  currentQuestion?: {
    id: string;
    text: string;
    correctAnswer?: {
      latitude: number;
      longitude: number;
    };
  };
  results: Array<{
    participantId: string;
    distance: number;
    name: string;
  }>;
}

export default function Quiz() {
  const { id } = useParams();
  const user = useUser();

  const [quiz, setQuiz] = useState<Quiz | undefined>();

  useEffect(() => {
    if (!id) return;
    const unsubscribe = db
      .collection("quiz-sessions")
      .doc(id)
      .onSnapshot((doc) => {
        const quizData = doc.data() as Quiz;

        if (!quizData) {
          return;
        }

        setQuiz({ ...quizData, id });
      });
    return unsubscribe;
  }, [id]);

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

  return null;
}
