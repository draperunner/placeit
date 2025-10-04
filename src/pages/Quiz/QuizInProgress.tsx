import { useState, useCallback, useEffect, Fragment, useRef } from "react";
import {
  Map,
  MapLayerMouseEvent,
  MapRef,
  Marker,
  Popup,
} from "react-map-gl/maplibre";
import "firebase/firestore";

import Button from "../../components/Button";
import { QuizSession } from "../../interfaces";
import { getBounds, usePrevious } from "../../utils";
import { getAuth, type User } from "firebase/auth";
import { SESSIONS_URL } from "../../constants";
import styles from "./QuizInProgress.module.css";
import { LineString } from "../../components/map/LineString";

type LatLng = { lat: number; lng: number };

interface Props {
  quiz: QuizSession;
  user: User | null | undefined;
}

const DEFAULT_POSITION: [latitude: number, longitude: number] = [0, 0];
const DEFAULT_ZOOM = 2;

export default function QuizSessionInProgress({ quiz, user }: Props) {
  const map = useRef<MapRef>(null);
  const [loadingNextQuestion, setLoadingNextQuestion] =
    useState<boolean>(false);

  const [answerMarker, setAnswerMarker] = useState<LatLng | null>(null);
  const [countDown, setCountDown] = useState<number | undefined>();

  const submitAnswer = useCallback(
    async (answer: LatLng) => {
      const currentUser = getAuth().currentUser;
      if (!currentUser) {
        console.log("No current user");
        return;
      }
      const token = await currentUser.getIdToken();

      await fetch(`${SESSIONS_URL}/${quiz.id}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: answer.lat,
          longitude: answer.lng,
        }),
      });
    },
    [quiz.id],
  );

  const onMapClick = useCallback(
    async (event: MapLayerMouseEvent) => {
      const coordinates = event.lngLat;

      if (countDown) {
        setAnswerMarker(coordinates);
        await submitAnswer(coordinates);
      }
    },
    [countDown, submitAnswer],
  );

  const nextQuestion = useCallback(async () => {
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      console.log("No current user");
      return;
    }
    setLoadingNextQuestion(true);
    const token = await currentUser.getIdToken();

    await fetch(`${SESSIONS_URL}/${quiz.id}/next-question`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    setLoadingNextQuestion(false);
  }, [quiz.id]);

  const gameOver = quiz.state === "over";
  const isHost = !!user && quiz.host.uid === user.uid;

  const { correctAnswer, givenAnswers, deadline } = quiz.currentQuestion || {};

  const previousCorrectAnswer = usePrevious(correctAnswer);

  // Set countdown based on question's deadline
  useEffect(() => {
    if (!deadline) {
      setCountDown(undefined);
      return;
    }

    const secondsUntilDeadline = Math.floor(
      (deadline.toMillis() - Date.now()) / 1000,
    );

    setCountDown(Math.max(0, secondsUntilDeadline));
  }, [deadline]);

  useEffect(() => {
    if (!isHost || !quiz.id) {
      return;
    }

    const ping = async () => {
      const currentUser = getAuth().currentUser;
      if (!currentUser) {
        return;
      }
      const token = await currentUser.getIdToken();
      await fetch(`${SESSIONS_URL}/${quiz.id}/ping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    };

    const interval = setInterval(ping, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [isHost, quiz.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof countDown === "undefined" || countDown === 0) {
        clearInterval(interval);
        return;
      }

      const newCountDown = countDown - 1;
      setCountDown(newCountDown);
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [countDown, deadline, quiz.answerTimeLimit]);

  useEffect(() => {
    if (
      !previousCorrectAnswer &&
      correctAnswer &&
      answerMarker &&
      map.current
    ) {
      map.current.fitBounds(
        getBounds([
          [answerMarker.lng, answerMarker.lat],
          [correctAnswer.longitude, correctAnswer.latitude],
        ]),
        { padding: 100 },
      );
    }
  }, [answerMarker, correctAnswer, previousCorrectAnswer]);

  const renderResults = () => {
    if (!correctAnswer || !givenAnswers) return null;

    return quiz.results?.map(({ participantId, points, name }) => {
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
    });
  };

  // New question
  useEffect(() => {
    setAnswerMarker(null);
    map.current?.flyTo({
      center: DEFAULT_POSITION,
      zoom: DEFAULT_ZOOM,
      duration: 0,
    });
  }, [quiz.currentQuestion?.id]);

  const { results = [] } = quiz;

  const renderQuestion = () => {
    let question = "";
    let helpText = "Loading question...";

    console.log(quiz);

    if (quiz.currentQuestion) {
      question = quiz.currentQuestion.text;
      helpText = "Click the map to place a marker.";
    }

    if (countDown === 0) {
      helpText = "Answer submitted! Waiting for the results...";
    }

    if (correctAnswer) {
      helpText = `The correct answer was of course at the blue marker.`;
    }

    const inBetweenQuestions = !gameOver && countDown === 0 && !!results;
    const showNextButton = !!correctAnswer && inBetweenQuestions && isHost;

    return (
      <div className={styles.quizPanel}>
        <div className={styles.quizPanelTop}>
          <div>
            <p>{question}</p>
            <p style={{ fontSize: 14, color: "dimgray" }}>{helpText}</p>
          </div>
          <div>
            {countDown ? (
              <div
                className={styles.deadline}
                style={{
                  color: countDown > 5 ? "black" : "red",
                }}
              >
                {countDown}
              </div>
            ) : null}
          </div>
        </div>
        {correctAnswer ? <ol>{renderResults()}</ol> : null}
        {showNextButton ? (
          <Button loading={loadingNextQuestion} onClick={nextQuestion}>
            Next question
          </Button>
        ) : null}
      </div>
    );
  };

  return (
    <div>
      <Map
        ref={map}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        initialViewState={{
          latitude: DEFAULT_POSITION[0],
          longitude: DEFAULT_POSITION[1],
          zoom: DEFAULT_ZOOM,
        }}
        style={{ height: "100vh" }}
        onClick={onMapClick}
        renderWorldCopies={false}
      >
        {answerMarker && !correctAnswer ? (
          <Marker latitude={answerMarker.lat} longitude={answerMarker.lng}>
            <img
              alt="Your answer"
              height={40}
              width={40}
              style={{ borderRadius: "50%" }}
              src={`https://joesch.moe/api/v1/${user?.uid}`}
            />
          </Marker>
        ) : null}
        {correctAnswer ? (
          <Marker
            latitude={correctAnswer.latitude}
            longitude={correctAnswer.longitude}
          />
        ) : null}
        {givenAnswers
          ? givenAnswers.map(({ participantId, answer }) => (
              <Fragment key={participantId}>
                {correctAnswer ? (
                  <LineString points={[answer, correctAnswer]} />
                ) : null}
                <Marker latitude={answer.latitude} longitude={answer.longitude}>
                  <img
                    alt="Your answer"
                    height={40}
                    width={40}
                    style={{ borderRadius: "50%" }}
                    src={`https://joesch.moe/api/v1/${participantId}`}
                  />
                </Marker>
                <Popup
                  offset={[0, -20]}
                  longitude={answer.longitude}
                  latitude={answer.latitude}
                  style={{ color: "black" }}
                  closeButton={false}
                >
                  {quiz.participants.find((p) => p.uid === participantId)
                    ?.name || ""}
                </Popup>
              </Fragment>
            ))
          : null}
      </Map>
      {renderQuestion()}
    </div>
  );
}
