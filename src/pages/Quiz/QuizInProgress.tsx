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

const DEFAULT_POSITION: [latitude: number, longitude: number] = [0, 0];
const DEFAULT_ZOOM = 2;

export default function QuizSessionInProgress({ quiz, user }: Props) {
  const map = useRef<MapRef>(null);
  const [loadingNextQuestion, setLoadingNextQuestion] =
    useState<boolean>(false);

  const [answerMarker, setAnswerMarker] = useState<LatLng>(randomLatLng());
  const [answerSubmitted, setAnswerSubmitted] = useState<boolean>(false);
  const [countDown, setCountDown] = useState<number | undefined>();

  const previousCountDown = usePrevious(countDown);

  const onMapClick = useCallback(
    (event: MapLayerMouseEvent) => {
      if (answerSubmitted) return;
      const coordinates = event.lngLat;
      setAnswerMarker(coordinates);
    },
    [answerSubmitted],
  );

  const submitAnswer = useCallback(async () => {
    setAnswerSubmitted(true);
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
        latitude: answerMarker.lat,
        longitude: answerMarker.lng,
      }),
    });
  }, [answerMarker, quiz.id]);

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
    if (!previousCorrectAnswer && correctAnswer && map.current) {
      map.current.fitBounds(
        getBounds([
          [answerMarker.lng, answerMarker.lat],
          [correctAnswer.longitude, correctAnswer.latitude],
        ]),
        { padding: 100 },
      );
    }
  }, [
    answerMarker.lat,
    answerMarker.lng,
    correctAnswer,
    previousCorrectAnswer,
  ]);

  const renderResults = () => {
    if (!correctAnswer || !givenAnswers) return null;

    return quiz.results.map(({ participantId, distance, name }) => {
      const accumulated = formatDistance(distance);

      const givenAnswer = givenAnswers.find(
        (givenAns) => givenAns.participantId === participantId,
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
    map.current?.flyTo({
      center: DEFAULT_POSITION,
      zoom: DEFAULT_ZOOM,
      duration: 0,
    });
  }, [quiz.currentQuestion?.id]);

  const isHost = !!user && quiz.host.uid === user.uid;

  // Submit on deadline
  useEffect(() => {
    if (
      typeof previousCountDown === "number" &&
      previousCountDown > 0 &&
      countDown === 0 &&
      !answerSubmitted
    ) {
      void submitAnswer();
    }
  }, [previousCountDown, countDown, answerSubmitted, submitAnswer, isHost]);

  const { results = [] } = quiz;

  const renderQuestion = () => {
    let question = "";
    let helpText = "Loading question...";

    if (quiz.currentQuestion) {
      question = quiz.currentQuestion.text;
      helpText = "Click the map to place a marker.";
    }

    if (answerSubmitted || countDown === 0) {
      helpText = "Answer submitted! Waiting for the results...";
    }

    if (correctAnswer) {
      helpText = `The correct answer was of course at the blue marker.`;
    }

    const inBetweenQuestions = !gameOver && countDown === 0 && !!results;
    const showForceButton = !correctAnswer && inBetweenQuestions && isHost;
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
        {showForceButton ? (
          <div>
            <p>
              Stuck? If some users quit or had network issues, this can happen.
            </p>
            <p>
              You can use the button below to force the quiz to continue.
              Participants that have a missing answer will get assigned a random
              answer that is twice the distance of the worst answer.
            </p>
            <Button
              variant="warning"
              loading={loadingNextQuestion}
              onClick={nextQuestion}
            >
              Force next question
            </Button>
          </div>
        ) : null}
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
        {!correctAnswer ? (
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
                    src={`https://joesch.moe/api/v1/${user?.uid}`}
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
