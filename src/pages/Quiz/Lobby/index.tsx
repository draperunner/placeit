import { useState } from "react";

import AppWrapper from "../../../AppWrapper";

import Button from "../../../components/Button";
import TextField from "../../../components/TextField";

import { QuizSession } from "../../../interfaces";
import { getLanguageName } from "../../../utils";

import { post } from "../../../http";

import styles from "./Lobby.module.css";
import { User } from "firebase/auth";
import { SESSIONS_URL } from "../../../constants";

function getMapPreview(url: string): string {
  const s = "a";
  const z = 5;
  const x = 15;
  const y = 12;
  return url
    .replace("{s}", s)
    .replace("{z}", z.toString())
    .replace("{x}", x.toString())
    .replace("{y}", y.toString());
}

function join(quizId: string, name: string) {
  return post(`${SESSIONS_URL}/${quizId}/join`, {
    name,
  });
}

function start(quizId: string) {
  return post(`${SESSIONS_URL}/${quizId}/start`, {});
}

interface Props {
  quiz: QuizSession;
  user: User | null | undefined;
}

export default function Lobby({ quiz, user }: Props) {
  const [name, setName] = useState<string>(user?.displayName || "");
  const [loading, setLoading] = useState<boolean>(false);

  const joined =
    !!user && quiz.participants.some(({ uid }) => uid === user.uid);

  const { host, quizDetails, map, answerTimeLimit } = quiz;

  const participants = quiz.participants.filter(({ uid }) => uid !== host.uid);

  const isHost = user && user.uid === host.uid;
  const hostIsParticipating = quiz.participants.some(
    ({ uid }) => uid === host.uid,
  );

  const isYou = (id: string) => user && user.uid === id;

  const startQuiz = async () => {
    setLoading(true);
    await start(quiz.id);
    setLoading(false);
  };

  return (
    <AppWrapper>
      <h1>Quiz hosted by {host.name}</h1>
      <p>We are now in the lobby, waiting for people to join.</p>
      <div className={styles.lobbyGrid}>
        <div>
          <h2>Host</h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <img
              className={styles.profilePic}
              src={`https://joesch.moe/api/v1/${host.uid}`}
              alt={host.name}
              height={40}
              width={40}
              style={{
                marginRight: 10,
              }}
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
                  src={`https://joesch.moe/api/v1/${participant.uid}`}
                  alt=""
                  className={styles.profilePic}
                  style={{
                    marginRight: 10,
                  }}
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
                onChange={(e) => {
                  setName(e.target.value);
                }}
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
          <p>{answerTimeLimit} seconds per question.</p>
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
