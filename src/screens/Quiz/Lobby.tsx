import React, { useState } from "react";

import firebase from "firebase";
import "firebase/firestore";

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

function join(quizId: string, uid: string, name: string) {
  db.collection("quiz-sessions")
    .doc(quizId)
    .update({
      participants: firebase.firestore.FieldValue.arrayUnion({
        uid,
        name,
      }),
    });
}

function startQuiz(quizId: string) {
  db.collection("quiz-sessions").doc(quizId).update({
    state: "in-progress",
  });
}

interface User {
  uid: string;
}

interface Props {
  quiz: Quiz;
  user: User | null;
}

export default function Lobby({ quiz, user }: Props) {
  const [name, setName] = useState<string>("");

  if (!quiz) {
    return (
      <div className="App">
        <p>Loading...</p>
      </div>
    );
  }

  const joined =
    !!user && quiz.participants.some(({ uid }) => uid === user.uid);

  const { host, participants = [] } = quiz;

  const isHost = user && host && user.uid === host.uid;

  const isYou = (id: string) => user && user.uid === id;

  return (
    <div className="App">
      <h1>Map Quiz by {host.name}</h1>
      <p>We are now in the lobby and waiting for people to join.</p>
      <h2>Host</h2>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <img
          src={`https://api.adorable.io/avatars/40/${host.uid}.png`}
          alt=""
          style={{ borderRadius: 20, marginRight: 10 }}
        />
        {host.name}
      </div>
      <h2>Participants</h2>
      <ul>
        {participants.map((participant) => (
          <li
            key={participant.uid}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src={`https://api.adorable.io/avatars/40/${participant.uid}.png`}
              alt=""
              style={{ borderRadius: 20, marginRight: 10 }}
            />
            {`${participant.name}${isYou(participant.uid) ? " (you)" : ""}`}
          </li>
        ))}
      </ul>

      {!isHost && !joined ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (user) {
              return join(quiz.id, user.uid, name);
            }
          }}
        >
          <label style={{ display: "flex", flexDirection: "column" }}>
            Nickname
            <input
              type="text"
              autoFocus
              value={name}
              style={{ maxWidth: 100, alignSelf: "center" }}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button type="submit">Join</button>
        </form>
      ) : null}

      {isHost ? (
        <button onClick={() => startQuiz(quiz.id)}>Start Quiz</button>
      ) : null}
    </div>
  );
}
