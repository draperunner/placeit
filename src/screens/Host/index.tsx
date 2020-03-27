import React, { useState, useCallback } from "react";
import { useHistory } from "react-router-dom";

import firebase from "firebase";
import "firebase/firestore";

import Button from "../../components/Button";

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

export default function Host() {
  const user = useUser();
  const history = useHistory();
  const [name, setName] = useState<string>("");
  const [quiz, setQuiz] = useState<string | undefined>();

  const quizzes = [
    {
      name: "Kongsquizzen",
      id: "skfsoi3920sdkjnf091238lskdf",
      author: {
        uid: "923i19023i",
        name: "The Maker",
      },
    },
  ];

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
        <label
          style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}
        >
          Your nickname
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        {quizzes.map((quiz) => (
          <label>
            <input
              type="radio"
              name="pick-quiz"
              value={quiz.name}
              onChange={(event) => setQuiz(quiz.id)}
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
