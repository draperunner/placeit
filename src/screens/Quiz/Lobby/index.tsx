import React, { useState } from "react";

import firebase from "firebase";
import "firebase/firestore";

import AppWrapper from "../../../AppWrapper";

import Button from "../../../components/Button";
import TextField from "../../../components/TextField";

import { QuizSession, User } from "../../../interfaces";

import "./styles.css";

const db = firebase.firestore();

function getMapPreview(url: string): string {
  const s = "a";
  const z = 5;
  const x = 15;
  const y = 12;
  return url
    .replace("{s}", s)
    .replace("{z}", "" + z)
    .replace("{x}", "" + x)
    .replace("{y}", "" + y);
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

interface Props {
  quiz: QuizSession;
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

  const { host, quizDetails, map } = quiz;

  const participants = (quiz.participants || []).filter(
    ({ uid }) => uid !== host.uid
  );

  const isHost = user && host && user.uid === host.uid;
  const hostIsParticipating = (quiz.participants || []).some(
    ({ uid }) => uid === host.uid
  );

  const isYou = (id: string) => user && user.uid === id;

  return (
    <AppWrapper>
      <h1>Map Quiz by {host.name}</h1>
      <p>We are now in the lobby, waiting for people to join.</p>
      <div className="lobby__grid">
        <div>
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
            {`${host.name}${hostIsParticipating ? " (participating)" : ""}`}
          </div>
          <h2>
            Partici
            <span role="img" aria-label="pants">
              👖
            </span>
          </h2>
          {!participants.length ? (
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
        </div>
        <div>
          <h2>Quiz Details</h2>
          <h3>{quizDetails.name}</h3>
          <i>by {quizDetails.author.name}</i>
          <p>{quizDetails.description}</p>
          <p>{quizDetails.numberOfQuestions} questions.</p>
          <p>15 seconds per question.</p>
          <h3>Map Style:</h3>
          <p style={{ display: "block", flexDirection: "column" }}>
            {map.name} by {map.author}
          </p>
          <img
            src={getMapPreview(map.url)}
            alt={`${map.name} by ${map.author}`}
          />
        </div>
      </div>

      {isHost ? (
        <Button onClick={() => startQuiz(quiz.id)}>
          {hostIsParticipating && !participants.length
            ? "Go solo!"
            : "Start it!"}
        </Button>
      ) : null}
    </AppWrapper>
  );
}
