import React, { useState, useCallback, useEffect } from "react";
import { useHistory } from "react-router-dom";

import firebase from "firebase";
import "firebase/firestore";

import Button from "../../components/Button";
import TextField from "../../components/TextField";

import { Quiz } from "../../interfaces";
import { useUser } from "../../auth";
import { post } from "../../http";

import "./styles.css";

enum Map {
  STANDARD = "STANDARD",
  NO_LABELS = "NO_LABELS",
}

function getMapUrl(map: Map): string {
  switch (map) {
    case Map.NO_LABELS:
      return "http://a.tiles.wmflabs.org/osm-no-labels/5/15/12.png";
    case Map.STANDARD:
    default:
      return "https://a.tile.osm.org/5/15/12.png";
  }
}

async function createQuizSession(hostName: string, quizId: string, map: Map) {
  const { session } = await post(
    "https://europe-west1-mapquiz-app.cloudfunctions.net/sessions",
    {
      hostName,
      quizId,
      map,
    }
  );

  return session.id;
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
  const [map, setMap] = useState<Map>(Map.STANDARD);

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
      createQuizSession(name, quiz, map).then((id) => {
        history.push(`/q/${id}`);
      });
    },
    [history, map, name, quiz]
  );

  return (
    <div className="host">
      <h1>Host a new Quiz Session</h1>

      <form onSubmit={onCreateQuiz}>
        <h2>You</h2>
        <TextField
          autoFocus
          label="Your nickname"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <h2>Quiz</h2>
        {!quizzes ? <p>Loading quizzes...</p> : null}

        <div className="quiz-radio-group">
          {(quizzes || []).map((q) => (
            <label
              className={`quiz-radio ${
                quiz === q.id ? "quiz-radio__selected" : ""
              }`}
            >
              <input
                type="radio"
                name="pick-quiz"
                value={q.name}
                onChange={() => setQuiz(q.id)}
              />
              <b>{q.name}</b>
              <p>{q.description}</p>
            </label>
          ))}
        </div>

        <h2>Map Type</h2>
        <div className="map-radio-group">
          <label
            className={`map-radio ${
              map === Map.STANDARD ? "map-radio__selected" : ""
            }`}
          >
            <input
              type="radio"
              name="pick-map"
              checked={map === Map.STANDARD}
              value={Map.STANDARD}
              onChange={() => setMap(Map.STANDARD)}
            />
            Standard
            <img src={getMapUrl(Map.STANDARD)} alt="" />
          </label>

          <label
            className={`map-radio ${
              map === Map.NO_LABELS ? "map-radio__selected" : ""
            }`}
          >
            <input
              type="radio"
              name="pick-map"
              checked={map === Map.NO_LABELS}
              value={Map.NO_LABELS}
              onChange={() => setMap(Map.NO_LABELS)}
            />
            No labels
            <img src={getMapUrl(Map.NO_LABELS)} alt="" />
          </label>
        </div>

        <Button type="submit" className="host__submit-button">
          Host it!
        </Button>
      </form>
    </div>
  );
}
