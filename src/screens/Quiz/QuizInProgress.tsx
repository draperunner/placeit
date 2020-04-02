import React, { useState, useCallback, useEffect, useRef } from "react";
import Leaflet from "leaflet";
import firebase from "firebase/app";
import { Map, TileLayer, Marker, Polygon, Tooltip } from "react-leaflet";
import "firebase/firestore";

import { QuizSession, User } from "../../interfaces";
import Button from "../../components/Button";

function usePrevious<T>(value: T): T | void {
  const ref = useRef<T | void>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

type LatLng = { lat: number; lng: number };

interface Props {
  quiz: QuizSession;
  user: User | null;
}

function formatDistance(meters: number): string {
  if (meters > 10000) {
    return `${Math.round(meters / 1000)} km`;
  }
  if (meters > 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

function randomLatLng(): LatLng {
  const randomLatitude = Math.random() * 180 - 90;
  const randomLongitude = Math.random() * 360 - 180;
  return { lat: randomLatitude, lng: randomLongitude };
}

const DEFAULT_POSITION: [number, number] = [0, 0];
const DEFAULT_ZOOM = 2;

export default function QuizSessionInProgress({ quiz, user }: Props) {
  const [position, setPosition] = useState<[number, number]>(DEFAULT_POSITION);
  const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM);

  const [answerMarker, setAnswerMarker] = useState<LatLng>(randomLatLng());
  const [answerSubmitted, setAnswerSubmitted] = useState<boolean>(false);
  const [countDown, setCountDown] = useState<number | undefined>();

  const previousCountDown = usePrevious(countDown);

  const onMapClick = useCallback(
    (event) => {
      if (answerSubmitted) return;
      const { latlng } = event;

      setAnswerMarker(latlng);
    },
    [answerSubmitted]
  );

  const submitAnswer = useCallback(() => {
    setAnswerSubmitted(true);
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      console.log("No current user");
      return;
    }
    currentUser.getIdToken().then((token: string) => {
      return fetch(
        `https://europe-west1-mapquiz-app.cloudfunctions.net/sessions/${quiz.id}/answer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            latitude: answerMarker.lat,
            longitude: answerMarker.lng,
          }),
        }
      );
    });
  }, [answerMarker, quiz.id]);

  const nextQuestion = useCallback(() => {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      console.log("No current user");
      return;
    }
    currentUser.getIdToken().then((token) => {
      fetch(
        `https://europe-west1-mapquiz-app.cloudfunctions.net/sessions/${quiz.id}/next-question`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }
      );
    });
  }, [quiz.id]);

  const gameOver = quiz.state === "over";

  const { correctAnswer, givenAnswers, deadline } = quiz.currentQuestion || {};

  const previousCorrectAnswer = usePrevious(correctAnswer);

  useEffect(() => {
    if (!deadline) {
      setCountDown(undefined);
      return;
    }
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const secondsLeft = Math.round((deadline.toMillis() - now) / 1000);
      console.log("Deadline:", deadline);
      console.log("Now:", now);
      console.log("Seconds until deadline:", secondsLeft);

      setCountDown(Math.max(0, secondsLeft));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  useEffect(() => {
    if (!previousCorrectAnswer && correctAnswer) {
      setPosition([correctAnswer.latitude, correctAnswer.longitude]);
      setZoom(10);
    }
  }, [correctAnswer, previousCorrectAnswer]);

  const renderResults = () => {
    if (!quiz || !quiz.results || !correctAnswer || !givenAnswers) return null;

    return quiz.results.map(({ participantId, distance, name }) => {
      const accumulated = formatDistance(distance);

      const givenAnswer = givenAnswers.find(
        (givenAns) => givenAns.participantId === participantId
      );
      const thisQuestionDistance = formatDistance(givenAnswer?.distance || 0);

      return (
        <li key={participantId}>
          {`${name} ${accumulated}`}
          <span
            style={{
              color: (givenAnswer?.distance || 0) < 1000 ? "green" : "red",
            }}
          >
            {" "}
            +{thisQuestionDistance}
          </span>
        </li>
      );
    });
  };

  // New question
  useEffect(() => {
    setAnswerMarker(randomLatLng());
    setAnswerSubmitted(false);
    setZoom(DEFAULT_ZOOM);
    setPosition(DEFAULT_POSITION);
  }, [quiz.currentQuestion?.id]);

  const isHost = user && quiz?.host.uid === user.uid;

  // Submit on deadline
  useEffect(() => {
    if (
      typeof previousCountDown === "number" &&
      previousCountDown > 0 &&
      countDown === 0 &&
      !answerSubmitted
    ) {
      submitAnswer();
    }
  }, [previousCountDown, countDown, answerSubmitted, submitAnswer, isHost]);

  if (!quiz) {
    return (
      <div className="App">
        <p>Loading...</p>
      </div>
    );
  }

  const { results = [] } = quiz;

  const renderQuestion = () => {
    let question = "";
    let helpText = "Loading question...";

    if (quiz.currentQuestion) {
      question = quiz.currentQuestion.text;
      helpText = "Click the map to place a marker.";
    }

    if (answerSubmitted || countDown === 0) {
      helpText = "Answer submitted! Waiting for the next question...";
    }

    if (correctAnswer) {
      helpText = `The correct answer was of course at the blue marker.`;
    }

    return (
      <div className="quiz-panel">
        <div className="quiz-panel__top">
          <div>
            <p>{question}</p>
            <p style={{ fontSize: 14, color: "dimgray" }}>{helpText}</p>
          </div>
          <div>
            {countDown ? (
              <div
                className="deadline"
                style={{
                  color: countDown > 5 ? "black" : "red",
                }}
              >
                {countDown}
              </div>
            ) : null}
          </div>
        </div>
        {correctAnswer && results ? <ol>{renderResults()}</ol> : null}
        {!gameOver && correctAnswer && results && isHost ? (
          <Button onClick={nextQuestion}>Next Question</Button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="App">
      <Map
        center={position}
        zoom={zoom}
        style={{ height: "100vh" }}
        onClick={onMapClick}
        zoomControl={false}
      >
        <TileLayer
          attribution={
            quiz.map?.attribution ||
            '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          }
          url={quiz.map?.url || "https://{s}.tile.osm.org/{z}/{x}/{y}.png"}
        />
        {answerMarker && !correctAnswer ? (
          <Marker
            position={answerMarker}
            icon={
              new Leaflet.Icon({
                iconUrl: `https://api.adorable.io/avatars/40/${user?.uid}.png`,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -22],
                className: "map-user-icon",
              })
            }
          />
        ) : null}
        {correctAnswer ? (
          <Marker
            position={{
              lat: correctAnswer.latitude,
              lng: correctAnswer.longitude,
            }}
          />
        ) : null}
        {givenAnswers
          ? givenAnswers.map(({ participantId, answer }) => (
              <>
                {correctAnswer ? (
                  <Polygon
                    weight={1}
                    positions={[
                      [answer.latitude, answer.longitude],
                      [correctAnswer.latitude, correctAnswer.longitude],
                    ]}
                  ></Polygon>
                ) : null}
                <Marker
                  key={participantId}
                  icon={
                    new Leaflet.Icon({
                      iconUrl: `https://api.adorable.io/avatars/40/${participantId}.png`,
                      iconSize: [40, 40],
                      iconAnchor: [20, 20],
                      popupAnchor: [0, -22],
                      className: "map-user-icon",
                    })
                  }
                  position={{
                    lat: answer.latitude,
                    lng: answer.longitude,
                  }}
                >
                  <Tooltip direction="top" permanent offset={[0, -20]}>
                    {quiz.participants.find((p) => p.uid === participantId)
                      ?.name || ""}
                  </Tooltip>
                </Marker>
              </>
            ))
          : null}
      </Map>
      {renderQuestion()}
    </div>
  );
}
