import React, { useState, useCallback, useEffect } from "react";
import { useHistory } from "react-router-dom";

import firebase from "firebase";
import "firebase/firestore";

import Button from "../../components/Button";
import TextField from "../../components/TextField";

import { Quiz } from "../../interfaces";
import { useUser } from "../../auth";

import "./styles.css";

const db = firebase.firestore();

async function createQuizSession(user: any, hostName: string) {
  if (!user) return;

  const docRef = await db.collection("quiz-sessions").add({
    host: {
      uid: user.uid,
      name: hostName,
    },
    participants: [],
    state: "lobby",
  });

  return docRef.id;
}

async function fetchQuizzes(): Promise<void | { quizzes: Quiz[] }> {
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) {
    console.log("No current user");
    return;
  }
  return currentUser.getIdToken().then((token) => {
    return fetch(
      "https://europe-west1-mapquiz-app.cloudfunctions.net/quizzes/",
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    ).then((res) => res.json());
  });
}

export default function Host() {
  const user = useUser();
  const history = useHistory();
  const [name, setName] = useState<string>("");
  const [quizzes, setQuizzes] = useState<Quiz[] | undefined>();
  const [quiz, setQuiz] = useState<string | undefined>();

  useEffect(() => {
    fetchQuizzes().then((result) => {
      if (!result) return;
      setQuizzes(result?.quizzes || []);
    });
  }, [user]);

  const onCreateQuiz = useCallback(
    (event) => {
      event.preventDefault();
      if (!name || !quiz) return alert("You need to fill out the form!");
      createQuizSession(user, name).then((id) => {
        history.push(`/q/${id}`);
      });
    },
    [history, name, quiz, user]
  );

  return (
    <div className="host">
      <h1>Host a new Quiz Session</h1>
      <form onSubmit={onCreateQuiz}>
        <TextField
          label="Your nickname"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        {!quizzes ? <p>Loading quizzes...</p> : null}

        {(quizzes || []).map((quiz) => (
          <label>
            <input
              type="radio"
              name="pick-quiz"
              value={quiz.name}
              onChange={() => setQuiz(quiz.id)}
            />
            {quiz.name}
          </label>
        ))}

        <Button type="submit" className="host__submit-button">
          Host it!
        </Button>
      </form>
    </div>
  );
}
