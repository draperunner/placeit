import React, { useState, useCallback, useEffect } from "react";
import { Map, TileLayer, Marker, Tooltip } from "react-leaflet";
import { useHistory } from "react-router-dom";
import firebase from "firebase/app";
import "firebase/firestore";

import { useUser } from "../../auth";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Dropdown from "../../components/Dropdown";
import Modal from "../../components/Modal";

import Navbar from "../../Navbar";

import languages from "../../languages";

import "./styles.css";

type LatLng = { lat: number; lng: number };

interface Question {
  text: string;
  correctAnswer: {
    latitude: number;
    longitude: number;
  };
}

interface IncompleteQuestion {
  text: string;
  correctAnswer: undefined;
}

function newQuestion(): IncompleteQuestion {
  return {
    text: "",
    correctAnswer: undefined,
  };
}

export default function Create() {
  const user = useUser();
  const history = useHistory();

  useEffect(() => {
    // if (user && (user.isAnonymous || !user.emailVerified)) {
    if (user && user.isAnonymous) {
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

  const [isPrivate, setIsPrivate] = useState<boolean>(
    draftQuiz.isPrivate || false
  );
  const [currentQuestion, setCurrentQuestion] = useState<
    IncompleteQuestion | Question
  >(draftQuiz.currentQuestion || newQuestion());

  const [answerMarker, setAnswerMarker] = useState<LatLng | void>();

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

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
    setSubmitting(true);
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
            isPrivate,
          }),
        }
      )
        .then(() => {
          localStorage.removeItem("quiz-draft");
          setSubmitting(false);
          setSubmitted(true);
        })
        .catch(() => setSubmitting(false));
    });
  };

  const addQuestion = () => {
    if (!currentQuestion.text) {
      alert("Your question needs text!");
    }

    if (currentQuestion.correctAnswer) {
      setQuestions((prevQuestions) => [...prevQuestions, currentQuestion]);
      setCurrentQuestion(newQuestion());
    } else {
      alert("You need to specify coordinates for your question.");
    }
  };

  const removeQuestion = (index: number) => {
    setQuestions((prevQuestions) =>
      prevQuestions.filter((_, i) => i !== index)
    );
  };

  const reset = () => {
    setName("");
    setDescription("");
    setQuestions([]);
    setCurrentQuestion(newQuestion());
    setSubmitted(false);
  };

  useEffect(() => {
    const quiz = {
      name,
      description,
      isPrivate,
      questions,
      currentQuestion,
    };

    localStorage.setItem("quiz-draft", JSON.stringify(quiz));
  }, [name, description, questions, isPrivate, currentQuestion]);

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
            label="Quiz Name"
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

          <label style={{ display: "block", marginTop: 20 }}>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={() => setIsPrivate((prev) => !prev)}
            />
            Make it private?
          </label>

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
          <div>{`Latitude: ${
            typeof currentQuestion.correctAnswer === "undefined"
              ? "?"
              : currentQuestion.correctAnswer.latitude
          }`}</div>
          <div>{`Longitude: ${
            typeof currentQuestion.correctAnswer === "undefined"
              ? "?"
              : currentQuestion.correctAnswer.longitude
          }`}</div>

          <Button
            type="button"
            style={{ display: "block", marginTop: 32 }}
            onClick={addQuestion}
          >
            Add question
          </Button>

          <Button
            loading={submitting}
            disabled={submitting}
            type="submit"
            style={{ marginTop: 32 }}
          >
            Submit Quiz!
          </Button>
        </form>
      </div>
    );
  };

  return (
    <div className="create">
      <Navbar />
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
            key={index}
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
      <Modal visible={submitted}>
        <h2>Hooray!</h2>
        <p>Your quiz "{name}" has been successfully created.</p>
        <Button onClick={reset} type="submit" style={{ marginTop: 32 }}>
          Nice.
        </Button>
      </Modal>
    </div>
  );
}
