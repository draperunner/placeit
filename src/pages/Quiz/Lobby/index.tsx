import React, { useState } from "react";
import firebase, { User } from "firebase/app";

import AppWrapper from "../../../AppWrapper";

import Button from "../../../components/Button";
import TextField from "../../../components/TextField";

import { QuizSession } from "../../../interfaces";
import { getLanguageName } from "../../../utils";

import { post } from "../../../http";

import "./styles.css";

function timestampToTime(timestamp: firebase.firestore.Timestamp): string {
  const date = timestamp.toDate();
  const hours = `${date.getHours()}`.padStart(2, "0");
  const min = `${date.getMinutes()}`.padStart(2, "0");

  return `${hours}:${min}`;
}

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

function join(quizId: string, name: string) {
  return post(
    `https://europe-west1-mapquiz-app.cloudfunctions.net/sessions/${quizId}/join`,
    {
      name,
    }
  );
}

function start(quizId: string) {
  return post(
    `https://europe-west1-mapquiz-app.cloudfunctions.net/sessions/${quizId}/start`,
    {}
  );
}

function sendChatMessage(quizId: string, message: string, authorName: string) {
  return post(
    `https://europe-west1-mapquiz-app.cloudfunctions.net/sessions/${quizId}/chat`,
    {
      message,
      author: {
        name: authorName,
      },
    }
  );
}

interface Props {
  quiz: QuizSession;
  user: User | null | undefined;
}

export default function Lobby({ quiz, user }: Props) {
  const [name, setName] = useState<string>(user?.displayName || "");
  const [loading, setLoading] = useState<boolean>(false);
  const [chatSent, setChatSent] = useState<boolean>(false);
  const [chatMessage, setChatMessage] = useState<string>("");

  if (!quiz) {
    return (
      <div className="lobby">
        <p>Loading...</p>
      </div>
    );
  }

  const joined =
    !!user && quiz.participants.some(({ uid }) => uid === user.uid);

  const { host, quizDetails, map, chat } = quiz;

  const participants = (quiz.participants || []).filter(
    ({ uid }) => uid !== host.uid
  );

  const isHost = user && host && user.uid === host.uid;
  const hostIsParticipating = (quiz.participants || []).some(
    ({ uid }) => uid === host.uid
  );

  const isYou = (id: string) => user && user.uid === id;

  const startQuiz = () => {
    setLoading(true);
    start(quiz.id).then(() => setLoading(false));
  };

  const postChat = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chatMessage) {
      return;
    }
    setChatSent(true);
    sendChatMessage(quiz.id, chatMessage, name);
  };

  return (
    <AppWrapper>
      <h1>Quiz hosted by {host.name}</h1>
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
              src={`https://joeschmoe.io/api/v1/${host.uid}`}
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
                  src={`https://joeschmoe.io/api/v1/${participant.uid}`}
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
                  return join(quiz.id, name);
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
          <p>Language: {getLanguageName(quizDetails.language)}.</p>
          <p>30 seconds per question.</p>
          <h3>Map Style:</h3>
          <p style={{ display: "block", flexDirection: "column" }}>
            {map.name} by {map.author}
          </p>
          <img
            style={{ borderRadius: 4 }}
            src={getMapPreview(map.url)}
            alt={`${map.name} by ${map.author}`}
          />
        </div>
        <div>
          <h2>Chat</h2>
          <p>Please be friendly in the chat.</p>
          {chat.messages.map(({ author, message, timestamp }) => (
            <div
              className="chat__entry"
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <img
                  alt={author.name}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginRight: 5,
                  }}
                  src={`https://joeschmoe.io/api/v1/${author.uid}`}
                />
                <span>{`said at ${timestampToTime(timestamp)}:`}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  paddingLeft: 20,
                }}
              >
                <p>{message}</p>
              </div>
            </div>
          ))}
          {joined && !chatSent ? (
            <form
              onSubmit={postChat}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-end",
              }}
            >
              <TextField
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                label="Chat message"
                style={{ flex: 1 }}
              />
              <Button
                type="submit"
                style={{ height: 33, margin: "0.5rem", padding: "0.5rem" }}
              >
                Send
              </Button>
            </form>
          ) : null}
          {!joined ? <p>You need to join before you can chat.</p> : null}
        </div>
      </div>

      {isHost ? (
        <Button loading={loading} onClick={startQuiz}>
          {hostIsParticipating && !participants.length
            ? "Go solo!"
            : "Start it!"}
        </Button>
      ) : null}
    </AppWrapper>
  );
}
