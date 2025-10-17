import { useState } from "react";
import { Map } from "react-map-gl/maplibre";
import { User } from "firebase/auth";

import AppWrapper from "../../../AppWrapper";

import Button from "../../../components/Button";
import TextField from "../../../components/TextField";
import Slider from "../../../components/Slider/Slider";

import { SESSIONS_URL } from "../../../constants";
import { QuizSession } from "../../../interfaces";
import { getLanguageName } from "../../../utils";
import { patch, post } from "../../../http";

import styles from "./Lobby.module.css";

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

async function updateQuizSession(
  sessionId: string,
  hostParticipates: boolean,
  answerTimeLimit: number,
  map: "STANDARD" | "NO_LABELS" | "NO_LABELS_NO_BORDERS",
  hostName?: string,
): Promise<void> {
  await patch<{ session: { id: string } }>(`${SESSIONS_URL}/${sessionId}`, {
    hostParticipates,
    answerTimeLimit,
    map,
    hostName,
  });
}

const MAP_STYLES = [
  { id: "STANDARD", name: "Standard" },
  { id: "NO_LABELS", name: "No labels" },
  { id: "NO_LABELS_NO_BORDERS", name: "No labels, no borders" },
];

export default function Lobby({ quiz, user }: Props) {
  const [hostName, setHostName] = useState<string>(quiz.host.name);
  const [editingHostName, setEditingHostName] = useState<boolean>(false);
  const [name, setName] = useState<string>(user?.displayName || "");
  const [loading, setLoading] = useState<boolean>(false);
  const [answerTimeLimit, setAnswerTimeLimit] = useState<number>(
    quiz.answerTimeLimit,
  );

  const joined =
    !!user && quiz.participants.some(({ uid }) => uid === user.uid);

  const { host, quizDetails } = quiz;

  const participants = quiz.participants.filter(({ uid }) => uid !== host.uid);

  const isHost = user && user.uid === host.uid;
  const hostIsParticipating = quiz.participants.some(
    ({ uid }) => uid === host.uid,
  );

  const isYou = (id: string) => user && user.uid === id;

  const startQuiz = async () => {
    if (!participants.length && !hostIsParticipating) {
      alert("At least one participant is required to start the quiz.");
      return;
    }
    setLoading(true);
    await start(quiz.id);
    setLoading(false);
  };

  return (
    <AppWrapper>
      <h1>It&apos;s Quiz Time!</h1>
      <p>We are in the lobby, waiting for people to join.</p>
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
            {editingHostName ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <TextField
                  value={hostName}
                  onChange={(e) => {
                    setHostName(e.target.value);
                  }}
                  autoFocus
                  label={"Nickname"}
                  onBlur={() => {
                    setEditingHostName(false);
                    void updateQuizSession(
                      quiz.id,
                      hostIsParticipating,
                      answerTimeLimit,
                      quiz.map.id,
                      hostName,
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setEditingHostName(false);
                      void updateQuizSession(
                        quiz.id,
                        hostIsParticipating,
                        answerTimeLimit,
                        quiz.map.id,
                        hostName,
                      );
                    }
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                }}
              >
                <span>{host.name}</span>
                {isHost ? (
                  <button
                    className={styles.editNameButton}
                    onClick={() => {
                      setEditingHostName(true);
                    }}
                  >
                    Edit
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {isHost ? (
            <label style={{ display: "block", marginTop: 20 }}>
              <input
                type="checkbox"
                checked={hostIsParticipating}
                onChange={() => {
                  void updateQuizSession(
                    quiz.id,
                    !hostIsParticipating,
                    answerTimeLimit,
                    quiz.map.id,
                  );
                }}
              />
              Participate yourself?
            </label>
          ) : (
            <p>
              The host is{" "}
              {`${hostIsParticipating ? "also" : "not"} participating.`}
            </p>
          )}
          <h2 style={{ marginTop: 32 }}>Participants</h2>
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
                if (!name.trim()) {
                  alert("Please enter a nickname to join the quiz.");
                  return;
                }
                if (user) {
                  void join(quiz.id, name);
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
          <h2>Quiz</h2>
          <h3 style={{ marginBottom: 2 }}>{quizDetails.name}</h3>
          <i>by {quizDetails.author.name}</i>
          <p>{quizDetails.description}</p>
          <p>{quizDetails.numberOfQuestions} questions.</p>
          <p>Language: {getLanguageName(quizDetails.language)}.</p>

          {!isHost && <p>{quiz.answerTimeLimit} seconds per question.</p>}

          {isHost && (
            <Slider
              label={`${answerTimeLimit} seconds per question`}
              value={answerTimeLimit}
              onChange={(event) => {
                setAnswerTimeLimit(Number(event.target.value));
              }}
              onPointerUp={(event) => {
                void updateQuizSession(
                  quiz.id,
                  hostIsParticipating,
                  (event.target as HTMLInputElement).valueAsNumber,
                  quiz.map.id,
                );
              }}
              min={5}
              max={180}
            />
          )}
        </div>

        <div>
          <h2>Map</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 2 }}>
                {MAP_STYLES.find((style) => style.id === quiz.map.id)?.name}
              </h3>
            </div>

            <Map
              mapStyle={quiz.map.url}
              style={{
                width: "100%",
                height: 256,
                borderRadius: 8,
              }}
            />

            {isHost && (
              <fieldset
                className={styles.mapRadioGroup}
                onChange={(e) => {
                  e.preventDefault();
                  const target = e.target as HTMLInputElement;
                  void updateQuizSession(
                    quiz.id,
                    hostIsParticipating,
                    answerTimeLimit,
                    target.value as
                      | "STANDARD"
                      | "NO_LABELS"
                      | "NO_LABELS_NO_BORDERS",
                  );
                }}
              >
                <legend>Other styles</legend>

                {MAP_STYLES.map((mapStyle) => (
                  <label
                    key={mapStyle.id}
                    className={`${styles.mapRadio} ${
                      quiz.map.id === mapStyle.id ? styles.mapRadioSelected : ""
                    }`}
                  >
                    <input type="radio" name="pick-map" value={mapStyle.id} />
                    {mapStyle.name}
                  </label>
                ))}
              </fieldset>
            )}
          </div>
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
