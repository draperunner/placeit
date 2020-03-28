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
  DARK_MATTER = "DARK_MATTER",
  WATERCOLOR = "WATERCOLOR",
  TONER_LITE = "TONER_LITE",
  VOYAGER = "VOYAGER",
  VOYAGER_NO_LABELS = "VOYAGER_NO_LABELS",
}

const MAPS = [
  {
    id: Map.STANDARD,
    name: "Mapnik",
    author: "OpenStreetMap",
    url: "https://a.tile.osm.org/5/15/12.png",
    attribution:
      '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors',
  },
  {
    id: Map.VOYAGER,
    name: "Voyager",
    author: "CARTO",
    url: "https://a.basemaps.cartocdn.com/rastertiles/voyager/5/15/12.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  {
    id: Map.VOYAGER_NO_LABELS,
    name: "Voyager No Labels",
    author: "CARTO",
    url:
      "https://a.basemaps.cartocdn.com/rastertiles/voyager_nolabels/5/15/12.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  {
    id: Map.DARK_MATTER,
    name: "Dark Matter",
    author: "CARTO",
    attribution:
      'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: "https://a.basemaps.cartocdn.com/dark_all/5/15/12.png",
  },
  {
    id: Map.WATERCOLOR,
    name: "Watercolor",
    author: "Stamen",
    attribution:
      'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: "https://stamen-tiles-a.a.ssl.fastly.net/watercolor/5/15/12.jpg",
  },
  {
    id: Map.TONER_LITE,
    name: "Toner Lite",
    author: "Stamen",
    attribution:
      'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: "https://stamen-tiles-a.a.ssl.fastly.net/toner-lite/5/15/12.png",
  },
];

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
          {MAPS.map(({ id, name, url, author }) => (
            <label
              className={`map-radio ${map === id ? "map-radio__selected" : ""}`}
            >
              <input
                type="radio"
                name="pick-map"
                checked={map === id}
                value={id}
                onChange={() => setMap(id)}
              />
              {name} by {author}
              <img src={url} alt="" />
            </label>
          ))}
        </div>

        <Button type="submit" className="host__submit-button">
          Host it!
        </Button>
      </form>
    </div>
  );
}
