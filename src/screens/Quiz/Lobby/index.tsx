import React, { useState } from "react";

import firebase from "firebase";
import "firebase/firestore";

import Button from "../../../components/Button";
import TextField from "../../../components/TextField";

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
      <div className="lobby">
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
    <div className="lobby">
      <h1>Map Quiz by {host.name}</h1>
      <p>We are now in the lobby, waiting for people to join.</p>
      <h2>Host</h2>
      <div
        style={{
          display: "flex",
          alignItems: "center",
        }}
      >
        <img
          src={`https://api.adorable.io/avatars/40/${host.uid}.png`}
          alt=""
          style={{ borderRadius: 20, marginRight: 10 }}
        />
        {`${host.name}${isHost ? " (you)" : ""}`}
      </div>
      <h2>Partici👖</h2>
      {isHost && !participants.length ? (
        <p>None yet! Share the URL with your friends to invite them.</p>
      ) : null}
      <ul>
        {participants.map((participant) => (
          <li
            key={participant.uid}
            style={{
              display: "flex",
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
          <TextField
            label="Nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Button type="submit" style={{ marginTop: 20 }}>
            Join
          </Button>
        </form>
      ) : null}

      {isHost ? (
        <Button onClick={() => startQuiz(quiz.id)}>Start Quiz</Button>
      ) : null}
    </div>
  );
}
