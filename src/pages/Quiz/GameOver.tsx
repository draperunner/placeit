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

  const winner = quiz.results?.[0];
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

    const resultsToShow =
      quiz.results
        ?.filter(({ participantId }) =>
          shownAnswers.some((a) => a.participantId === participantId),
        )
        .sort((a, b) => b.points - a.points) ?? [];

    let description = "Time for the big reveal ...";

    if (allShown) {
      description = winner
        ? `Congratulations, ${winner.name} 🎉`
        : "Congratulations!";
    }

    return (
      <div className={styles.quizPanel}>
        <h1>Game Over</h1>
        <p>{description}</p>
        <ol>
          {resultsToShow.map(({ participantId, points, name }) => {
            const givenAnswer = givenAnswers.find(
              (givenAns) => givenAns.participantId === participantId,
            );
            const thisQuestionPoints = givenAnswer?.points;

            return (
              <li key={participantId}>
                {name} – {points} points
                {typeof thisQuestionPoints === "number" ? (
                  <span
                    style={{
                      color: "green",
                    }}
                  >
                    {` +${thisQuestionPoints}`}
                  </span>
                ) : (
                  <span style={{ color: "red" }}> (no answer!)</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }, [
    allShown,
    correctAnswer,
    givenAnswers,
    quiz.results,
    shownAnswers,
    winner,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!correctAnswer) {
        return null;
      }

      if (allShown) {
        clearInterval(interval);
        const winnersAnswer = givenAnswers.find(
          ({ participantId }) => participantId === winner?.participantId,
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
  }, [allShown, correctAnswer, givenAnswers, shownAnswers.length, winner]);

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
