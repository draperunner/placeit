import React, { useState, useCallback, useEffect, useRef } from "react";
import firebase from "firebase/app";
import Leaflet from "leaflet";
import { Map, TileLayer, Marker, Polygon, Tooltip } from "react-leaflet";

import { usePrevious } from "../../utils";
import { QuizSession, GivenAnswer } from "../../interfaces";

interface Props {
  quiz: QuizSession;
  user: firebase.User | null | undefined;
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

const DEFAULT_POSITION: [number, number] = [0, 0];
const DEFAULT_ZOOM = 2;
const REVEAL_INTERVAL = 5 * 1000;

export default function QuizSessionInProgress({ quiz, user }: Props) {
  const [position, setPosition] = useState<[number, number]>(DEFAULT_POSITION);
  const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM);
  const { correctAnswer, givenAnswers = [] } = quiz.currentQuestion || {};
  const [shownAnswers, setShowAnswers] = useState<GivenAnswer[]>([]);
  const [allowMapMove, setAllowMapMove] = useState<boolean>(false);

  const [bounds, setBounds] = useState<Leaflet.LatLngBounds | undefined>(
    undefined,
  );

  const map = useRef(null);

  const previousCorrectAnswer = usePrevious(correctAnswer);

  const winner = quiz.results[0];
  const allShown = shownAnswers.length === givenAnswers.length;

  useEffect(() => {
    if (!previousCorrectAnswer && correctAnswer) {
      setPosition([correctAnswer.latitude, correctAnswer.longitude]);
      setZoom(10);
    }
  }, [correctAnswer, previousCorrectAnswer]);

  const renderResults = useCallback(() => {
    if (!quiz || !quiz.results || !correctAnswer || !givenAnswers) return null;

    const resultsToShow = quiz.results
      .filter(({ participantId }) =>
        shownAnswers.some((a) => a.participantId === participantId),
      )
      .sort((a, b) => a.distance - b.distance);

    let description = "Time for the big reveal ...";

    if (allShown) {
      description = `Congratulations, ${winner.name} 🎉`;
    }

    return (
      <div className="quiz-panel">
        <h1>Game Over</h1>
        <p>{description}</p>
        <ol>
          {resultsToShow.map(({ participantId, distance, name }) => {
            const accumulated = formatDistance(distance);

            const givenAnswer = givenAnswers.find(
              (givenAns) => givenAns.participantId === participantId,
            );
            const thisQuestionDistance = formatDistance(
              givenAnswer?.distance || 0,
            );

            return (
              <li key={participantId}>
                {`${name} ${accumulated}`}
                <span
                  style={{
                    color:
                      (givenAnswer?.distance || 0) < 1000 ? "green" : "red",
                  }}
                >
                  {" "}
                  +{thisQuestionDistance}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }, [allShown, correctAnswer, givenAnswers, quiz, shownAnswers, winner.name]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!correctAnswer) {
        return null;
      }

      if (allShown) {
        clearInterval(interval);
        const winnersAnswer = givenAnswers.find(
          ({ participantId }) => participantId === winner.participantId,
        )?.answer;

        if (!winnersAnswer) return null;

        const bounds = Leaflet.latLngBounds(
          {
            lat: winnersAnswer.latitude,
            lng: winnersAnswer.longitude,
          },
          {
            lat: correctAnswer.latitude,
            lng: correctAnswer.longitude,
          },
        );
        setBounds(bounds);
        return;
      }

      const numShown = shownAnswers.length;
      const givenAnswer = givenAnswers[numShown];
      const coords = givenAnswer.answer;
      const bounds = Leaflet.latLngBounds(
        {
          lat: coords.latitude,
          lng: coords.longitude,
        },
        {
          lat: correctAnswer.latitude,
          lng: correctAnswer.longitude,
        },
      );
      setShowAnswers((prevShownAnswers) => [...prevShownAnswers, givenAnswer]);
      setBounds(bounds);
    }, REVEAL_INTERVAL);
    return () => clearInterval(interval);
  }, [
    allShown,
    correctAnswer,
    givenAnswers,
    shownAnswers.length,
    winner.participantId,
  ]);

  useEffect(() => {
    const timeout = setTimeout(
      () => setAllowMapMove(true),
      (givenAnswers.length + 1) * REVEAL_INTERVAL,
    );
    return () => clearTimeout(timeout);
  }, [givenAnswers.length]);

  if (!quiz) {
    return (
      <div className="App">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <Map
        center={position}
        zoom={zoom}
        style={{ height: "100vh" }}
        zoomControl={false}
        useFlyTo
        bounds={bounds}
        boundsOptions={{
          animate: true,
          duration: 2,
          paddingTopLeft: [40, 40],
          paddingBottomRight: [40, 40],
        }}
        ref={map}
        dragging={allowMapMove}
        keyboard={allowMapMove}
        touchZoom={allowMapMove}
        scrollWheelZoom={allowMapMove}
        doubleClickZoom={allowMapMove}
      >
        <TileLayer
          attribution={
            quiz.map?.attribution ||
            '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          }
          url={quiz.map?.url || "https://{s}.tile.osm.org/{z}/{x}/{y}.png"}
        />
        {correctAnswer ? (
          <Marker
            position={{
              lat: correctAnswer.latitude,
              lng: correctAnswer.longitude,
            }}
          />
        ) : null}
        {shownAnswers
          ? shownAnswers.map(({ participantId, answer }) => (
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
                      iconUrl: `https://joesch.moe/api/v1/${participantId}`,
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
      {renderResults()}
    </div>
  );
}
