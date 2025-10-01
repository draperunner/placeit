import { useState, useCallback, useEffect, useRef, Fragment } from "react";
import { Map, MapRef, Marker, Popup } from "react-map-gl/maplibre";

import { usePrevious } from "../../utils";
import { QuizSession, GivenAnswer } from "../../interfaces";
import { User } from "firebase/auth";
import styles from "./GameOver.module.css";
import { LineString } from "../../components/map/LineString";

interface Props {
  quiz: QuizSession;
  user: User | null | undefined;
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

function getBounds(
  points: [longitude: number, latitude: number][],
): [sw: [number, number], ne: [number, number]] {
  const lats = points.map(([, lat]) => lat);
  const lngs = points.map(([lng]) => lng);
  const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
  const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
  return [sw, ne];
}

const DEFAULT_POSITION: [number, number] = [0, 0];
const DEFAULT_ZOOM = 2;
const REVEAL_INTERVAL = 5 * 1000;

export default function QuizSessionInProgress({ quiz }: Props) {
  const { correctAnswer, givenAnswers = [] } = quiz.currentQuestion || {};
  const [shownAnswers, setShowAnswers] = useState<GivenAnswer[]>([]);
  const map = useRef<MapRef>(null);

  const previousCorrectAnswer = usePrevious(correctAnswer);

  const winner = quiz.results[0];
  const allShown = shownAnswers.length === givenAnswers.length;

  useEffect(() => {
    if (!previousCorrectAnswer && correctAnswer) {
      map.current?.flyTo({
        center: [correctAnswer.longitude, correctAnswer.latitude],
        zoom: 10,
      });
    }
  }, [correctAnswer, previousCorrectAnswer]);

  const renderResults = useCallback(() => {
    if (!correctAnswer) return null;

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
      <div className={styles.quizPanel}>
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

        map.current?.fitBounds(
          getBounds([
            [winnersAnswer.longitude, winnersAnswer.latitude],
            [correctAnswer.longitude, correctAnswer.latitude],
          ]),
          { padding: 100 },
        );

        return;
      }

      const numShown = shownAnswers.length;
      const givenAnswer = givenAnswers[numShown];
      setShowAnswers((prevShownAnswers) => [...prevShownAnswers, givenAnswer]);

      map.current?.fitBounds(
        getBounds([
          [givenAnswer.answer.longitude, givenAnswer.answer.latitude],
          [correctAnswer.longitude, correctAnswer.latitude],
        ]),
        { padding: 100 },
      );
    }, REVEAL_INTERVAL);
    return () => {
      clearInterval(interval);
    };
  }, [
    allShown,
    correctAnswer,
    givenAnswers,
    shownAnswers.length,
    winner.participantId,
  ]);

  return (
    <div>
      <Map
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        ref={map}
        initialViewState={{
          latitude: DEFAULT_POSITION[0],
          longitude: DEFAULT_POSITION[1],
          zoom: DEFAULT_ZOOM,
        }}
        style={{ height: "100vh" }}
      >
        {correctAnswer ? (
          <Marker
            latitude={correctAnswer.latitude}
            longitude={correctAnswer.longitude}
          />
        ) : null}
        {shownAnswers.map(({ participantId, answer }) => (
          <Fragment key={participantId}>
            {correctAnswer ? (
              <LineString points={[answer, correctAnswer]} />
            ) : null}
            <Marker latitude={answer.latitude} longitude={answer.longitude}>
              <img
                alt={participantId}
                height={40}
                width={40}
                style={{ borderRadius: "50%", background: "white" }}
                src={`https://joesch.moe/api/v1/${participantId}`}
              />
            </Marker>
            <Popup
              longitude={answer.longitude}
              latitude={answer.latitude}
              style={{ color: "black" }}
              offset={[0, -20]}
              closeButton={false}
            >
              {quiz.participants.find((p) => p.uid === participantId)?.name ||
                ""}
            </Popup>
          </Fragment>
        ))}
      </Map>
      {renderResults()}
    </div>
  );
}
