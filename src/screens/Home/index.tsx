import React, { useState, useCallback } from "react";

import firebase from "firebase";
import "firebase/firestore";

import { useHistory } from "react-router-dom";

import { useUser } from "../../auth";

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

export default function Home() {
  const user = useUser();
  const history = useHistory();
  const [name, setName] = useState<string>("");

  const onCreateQuiz = useCallback(() => {
    createQuizSession(user, name).then((id) => {
      history.push(`/q/${id}`);
    });
  }, [history, name, user]);

  return (
    <div className="App">
      <h1>Map Quiz</h1>
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <button onClick={onCreateQuiz}>Host a quiz!</button>
    </div>
  );
}
