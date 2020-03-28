import React, { useState, useCallback, useEffect } from "react";
import { Map, TileLayer, Marker, Tooltip } from "react-leaflet";
import firebase from "firebase";
import "firebase/firestore";

import Button from "../../components/Button";
import TextField from "../../components/TextField";

type LatLng = { lat: number; lng: number };

interface Question {
  text: string;
  correctAnswer: {
    latitude: number;
    longitude: number;
  };
}

function newQuestion(): Question {
  return {
    text: "",
    correctAnswer: { latitude: 0, longitude: 0 },
  };
}

export default function Create() {
  const draft = localStorage.getItem("quiz-draft");

  const draftQuiz = draft ? JSON.parse(draft) : {};

  const [name, setName] = useState<string>(draftQuiz.name || "");
  const [description, setDescription] = useState<string>(
    draftQuiz.description || ""
  );
  const [questions, setQuestions] = useState<Question[]>(
    draftQuiz.questions || []
  );

  const [currentQuestion, setCurrentQuestion] = useState<Question>(
    newQuestion()
  );

  const [answerMarker, setAnswerMarker] = useState<LatLng | void>();

  const onMapClick = useCallback((event) => {
    const { latlng } = event;

    setAnswerMarker(latlng);
    setCurrentQuestion((prevCurrentQuestion) => ({
      ...prevCurrentQuestion,
      correctAnswer: { latitude: latlng.lat, longitude: latlng.lng },
    }));
  }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid()) {
      return alert(
        "You need to fill out name, description and add at least one question!"
      );
    }
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      console.log("No current user");
      return;
    }
    localStorage.removeItem("quiz-draft");
    currentUser.getIdToken().then((token: string) => {
      return fetch(
        // `https://europe-west1-mapquiz-app.cloudfunctions.net/quizzes`,
        `http://localhost:5001/mapquiz-app/europe-west1/quizzes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            description,
            questions,
          }),
        }
      ).then(() => localStorage.removeItem("quiz-draft"));
    });
  };

  const addQuestion = () => {
    setQuestions((prevQuestions) => [...prevQuestions, currentQuestion]);
    setCurrentQuestion(newQuestion());
  };

  useEffect(() => {
    const quiz = {
      name,
      description,
      questions,
    };

    localStorage.setItem("quiz-draft", JSON.stringify(quiz));
  }, [name, description, questions]);

  const isValid = (): boolean => {
    return Boolean(name?.length && description?.length && questions.length);
  };

  const renderLeftMargin = () => {
    return (
      <div
        className="question"
        style={{
          position: "absolute",
          padding: 32,
          borderRadius: 4,
          backgroundColor: "white",
          top: 100,
          left: 60,
          zIndex: 500,
          textAlign: "left",
          width: 300,
        }}
      >
        <h2>Quiz Creator</h2>

        <h3>Details</h3>

        <form onSubmit={onSubmit}>
          <TextField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <TextField
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          <h3>Questions</h3>

          {questions.map((question, index) => (
            <div key={question.text} style={{ marginBottom: 10 }}>
              <p>{`Question ${index + 1}: ${question.text}`}</p>
            </div>
          ))}

          <TextField
            label={`Question ${questions.length + 1}:`}
            value={currentQuestion.text}
            onChange={(event) => {
              const value = event.target.value;
              setCurrentQuestion((prev) => ({
                ...prev,
                text: value,
              }));
            }}
          />

          <p>Correct answer: </p>
          <div>{`Latitude: ${currentQuestion.correctAnswer?.latitude}`}</div>
          <div>{`Longitude: ${currentQuestion.correctAnswer?.longitude}`}</div>

          <Button
            type="button"
            style={{ display: "block", marginTop: 32 }}
            onClick={addQuestion}
          >
            Add question
          </Button>

          <Button type="submit" style={{ marginTop: 32 }}>
            Submit Quiz!
          </Button>
        </form>
      </div>
    );
  };

  // Standard: https://{s}.tile.osm.org/{z}/{x}/{y}.png
  // No labels: http://{s}.tiles.wmflabs.org/osm-no-labels/{z}/{x}/{y}.png

  return (
    <div className="create">
      <Map
        center={[0, 0]}
        zoom={2}
        style={{ height: "100vh" }}
        onClick={onMapClick}
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.osm.org/{z}/{x}/{y}.png"
        />
        {answerMarker ? <Marker position={answerMarker} /> : null}
        {questions.map(({ correctAnswer }, index) => (
          <Marker
            position={{
              lat: correctAnswer.latitude,
              lng: correctAnswer.longitude,
            }}
          >
            <Tooltip direction="top" permanent offset={[0, -10]}>{`Q${
              index + 1
            }`}</Tooltip>
          </Marker>
        ))}
      </Map>
      {renderLeftMargin()}
    </div>
  );
}