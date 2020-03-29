import React, { useState, useCallback, useEffect } from "react";
import { Map, TileLayer, Marker, Tooltip } from "react-leaflet";
import { useHistory } from "react-router-dom";
import firebase from "firebase";
import "firebase/firestore";

import { useUser } from "../../auth";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Dropdown from "../../components/Dropdown";

import languages from "../../languages";

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
  const user = useUser();
  const history = useHistory();

  useEffect(() => {
    const isAnonymous = user && user.isAnonymous;
    if (isAnonymous) {
      history.push("/login");
    }
  }, [history, user]);

  const draft = localStorage.getItem("quiz-draft");

  const draftQuiz = draft ? JSON.parse(draft) : {};

  const [name, setName] = useState<string>(draftQuiz.name || "");
  const [description, setDescription] = useState<string>(
    draftQuiz.description || ""
  );
  const [language, setLanguage] = useState<string>("en");
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
        `https://europe-west1-mapquiz-app.cloudfunctions.net/quizzes`,
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
            language,
          }),
        }
      ).then(() => localStorage.removeItem("quiz-draft"));
    });
  };

  const addQuestion = () => {
    setQuestions((prevQuestions) => [...prevQuestions, currentQuestion]);
    setCurrentQuestion(newQuestion());
  };

  const removeQuestion = (index: number) => {
    setQuestions((prevQuestions) =>
      prevQuestions.filter((_, i) => i !== index)
    );
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
          top: 40,
          left: 0,
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

          <Dropdown
            label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            options={languages.map(({ code, name, native }) => ({
              value: code,
              label: `${name} (${native})`,
            }))}
          />

          <h3>Questions</h3>

          {questions.map((question, index) => (
            <div
              key={question.text}
              style={{
                marginBottom: 10,
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <p
                style={{
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >{`Q${index + 1}: ${question.text}`}</p>
              <button onClick={() => removeQuestion(index)}>X</button>
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

  return (
    <div className="create">
      <Map
        center={[0, 0]}
        zoom={2}
        style={{ height: "100vh" }}
        onClick={onMapClick}
        zoomControl={false}
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
