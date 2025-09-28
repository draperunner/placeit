import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "firebase/firestore";

import Button from "../../components/Button";
import TextField from "../../components/TextField";

import { Quiz } from "../../interfaces";
import { useUser } from "../../auth";
import { post } from "../../http";
import { usePrevious, getLanguageName } from "../../utils";

import "./styles.css";
import {
  collection,
  getDocs,
  getFirestore,
  query,
  QuerySnapshot,
  where,
} from "firebase/firestore";
import { SESSIONS_URL } from "../../constants";

enum Map {
  STANDARD = "STANDARD",
  DARK_MATTER = "DARK_MATTER",
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
    url: "https://a.basemaps.cartocdn.com/rastertiles/voyager_nolabels/5/15/12.png",
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
];

async function createQuizSession(
  hostName: string,
  quizId: string,
  map: Map,
  hostParticipates: boolean,
  answerTimeLimit: number,
) {
  const { session } = await post<{ session: { id: string } }>(SESSIONS_URL, {
    hostName,
    quizId,
    map,
    hostParticipates,
    answerTimeLimit,
  });

  return session.id;
}

const db = getFirestore();

function docsToData<T>(docs: QuerySnapshot): T[] {
  const dataArray: T[] = [];

  docs.forEach((doc) => {
    const data = doc.data() as T;
    const id = doc.id;
    dataArray.push({ ...data, id });
  });

  return dataArray;
}

export default function Host() {
  const user = useUser();
  const navigate = useNavigate();
  const [name, setName] = useState<string>(user?.displayName || "");
  const [publicQuizzes, setPublicQuizzes] = useState<Quiz[] | undefined>();
  const [personalQuizzes, setPersonalQuizzes] = useState<Quiz[] | undefined>();
  const [quiz, setQuiz] = useState<string | undefined>();
  const [answerTimeLimit, setAnswerTimeLimit] = useState<number>(30);
  const [map, setMap] = useState<Map>(Map.STANDARD);
  const [hostParticipates, setHostParticipates] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  const previousUser = usePrevious(user);

  useEffect(() => {
    if (!previousUser && user) {
      setName(user.displayName || "");
    }
  }, [previousUser, user]);

  useEffect(() => {
    if (!user) return;

    const collectionRef = collection(db, "quizzes");

    void Promise.all([
      getDocs(
        query(
          collectionRef,
          where("author.uid", "!=", user.uid),
          where("isPrivate", "==", false),
        ),
      ),
      getDocs(query(collectionRef, where("author.uid", "==", user.uid))),
    ]).then(([publicQuizRefs, personalQuizRefs]) => {
      setPublicQuizzes(docsToData<Quiz>(publicQuizRefs));
      setPersonalQuizzes(docsToData<Quiz>(personalQuizRefs));
    });
  }, [user]);

  const onCreateQuiz: React.FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      event.preventDefault();
      if (!name) {
        alert("You need to choose a name!");
        return;
      }
      if (!quiz) {
        alert("You need to choose a quiz!");
        return;
      }

      try {
        setLoading(true);
        const id = await createQuizSession(
          name,
          quiz,
          map,
          hostParticipates,
          answerTimeLimit,
        );
        await navigate(`/q/${id}`);
      } finally {
        setLoading(false);
      }
    },
    [answerTimeLimit, hostParticipates, map, name, navigate, quiz],
  );

  return (
    <div className="host">
      <h1>Host a new Quiz Session</h1>

      <form onSubmit={onCreateQuiz}>
        <h2>About you</h2>
        <TextField
          autoFocus
          label="Your nickname"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />

        <label style={{ display: "block", marginTop: 20 }}>
          <input
            type="checkbox"
            checked={hostParticipates}
            onChange={() => {
              setHostParticipates((prev) => !prev);
            }}
          />
          Participate yourself?
        </label>

        <h2>Time Limit</h2>
        <p>How hard do you want this to be?</p>
        <label>
          Seconds per answer:&nbsp;
          <input
            type="number"
            value={answerTimeLimit}
            min={5}
            max={60}
            onChange={(e) => {
              setAnswerTimeLimit(Number(e.currentTarget.value));
            }}
          />
        </label>

        <h2>Select a Quiz</h2>
        {!publicQuizzes ? <p>Loading quizzes...</p> : null}

        {personalQuizzes?.length ? (
          <>
            <h3>Your quizzes</h3>
            <div className="quiz-radio-group">
              {personalQuizzes.map((q) => (
                <label
                  key={q.id}
                  className={`quiz-radio ${
                    quiz === q.id ? "quiz-radio__selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="pick-quiz"
                    value={q.name}
                    onChange={() => {
                      setQuiz(q.id);
                    }}
                  />
                  <b>{q.name}</b>
                  <i>by {q.author.name}</i>
                  <p>{q.description}</p>
                  <p>Language: {getLanguageName(q.language)}</p>
                  <p>{q.isPrivate ? "Private." : "Public."}</p>
                </label>
              ))}
            </div>
          </>
        ) : null}

        {publicQuizzes?.length ? (
          <>
            <h3>Public quizzes</h3>
            <div className="quiz-radio-group">
              {publicQuizzes.map((q) => (
                <label
                  key={q.id}
                  className={`quiz-radio ${
                    quiz === q.id ? "quiz-radio__selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="pick-quiz"
                    value={q.name}
                    onChange={() => {
                      setQuiz(q.id);
                    }}
                  />
                  <b>{q.name}</b>
                  <i>by {q.author.name}</i>
                  <p>{q.description}</p>
                  <p>Language: {getLanguageName(q.language)}</p>
                </label>
              ))}
            </div>
          </>
        ) : null}

        <h2>Map Type</h2>
        <div className="map-radio-group">
          {MAPS.map(({ id, name, url, author }) => (
            <label
              key={id}
              className={`map-radio ${map === id ? "map-radio__selected" : ""}`}
            >
              <input
                type="radio"
                name="pick-map"
                checked={map === id}
                value={id}
                onChange={() => {
                  setMap(id);
                }}
              />
              {name} by {author}
              <img src={url} alt="" />
            </label>
          ))}
        </div>

        <Button loading={loading} type="submit" className="host__submit-button">
          Host it!
        </Button>
      </form>
    </div>
  );
}
