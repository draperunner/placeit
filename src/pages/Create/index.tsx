import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LngLat, Map, MapLayerMouseEvent, Marker } from "react-map-gl/maplibre";
import "firebase/firestore";
import { Feature, Polygon as GeoJSONPolygon } from "geojson";
import circle from "@turf/circle";

import { useUser } from "../../auth";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Dropdown from "../../components/Dropdown";
import Modal from "../../components/Modal";

import Navbar from "../../Navbar";

import languages from "../../languages";
import { updateProfile } from "firebase/auth";
import { QUIZZES_URL } from "../../constants";
import styles from "./Create.module.css";
import { Circle } from "../../components/map/Circle";
import { Polygon } from "../../components/map/Polygon";
import Slider from "../../components/Slider/Slider";
import { formatDistance } from "../../utils";

const DEFAULT_RADIUS = 1000; // meters

type Question = Feature<GeoJSONPolygon, { text: string }>;

type QuizDraft = {
  name: string;
  description: string;
  isPrivate: boolean;
  questions: Question[];
  currentQuestion: Question;
};

export default function Create() {
  const user = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.isAnonymous) {
      void navigate("/login", { replace: true });
    }
  }, [navigate, user]);

  const draft = localStorage.getItem("quiz-draft");

  const draftQuiz = draft ? (JSON.parse(draft) as Partial<QuizDraft>) : null;

  const [name, setName] = useState<string>(draftQuiz?.name || "");
  const [description, setDescription] = useState<string>(
    draftQuiz?.description || "",
  );
  const [language, setLanguage] = useState<string>("en");
  const [questions, setQuestions] = useState<Question[]>(
    draftQuiz?.questions || [],
  );
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS);

  const [isPrivate, setIsPrivate] = useState<boolean>(
    draftQuiz?.isPrivate || false,
  );

  const [currentText, setCurrentText] = useState<string>("");
  const [coordinates, setCurrentCoordinates] = useState<LngLat | undefined>();

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const onMapClick = useCallback((event: MapLayerMouseEvent) => {
    const coordinates = event.lngLat;
    setCurrentCoordinates(coordinates);
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid()) {
      alert(
        "You need to fill out name, description and add at least one question!",
      );
      return;
    }
    if (!user || user.isAnonymous) {
      return;
    }

    if (!user.displayName) {
      const name = window.prompt(
        "Please provide your display name, which will be public on quizzes you create. You can change it later in your profile.",
      );
      await updateProfile(user, {
        ...user,
        displayName: name || "",
      });
    }

    setSubmitting(true);
    const token = await user.getIdToken();

    await fetch(QUIZZES_URL, {
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
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Request failed");
        }

        localStorage.removeItem("quiz-draft");
        setSubmitting(false);
        setSubmitted(true);
      })
      .catch(() => {
        setSubmitting(false);
      });
  };

  const addQuestion = () => {
    if (!currentText.trim()) {
      alert("Your question needs text!");
      return;
    }

    const newQuestion: Question = circle(
      [coordinates?.lng ?? 0, coordinates?.lat ?? 0],
      radius,
      {
        steps: 64,
        units: "meters",
        properties: {
          text: currentText,
        },
      },
    );

    setCurrentText("");
    setQuestions((prevQuestions) => [...prevQuestions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prevQuestions) =>
      prevQuestions.filter((_, i) => i !== index),
    );
  };

  const reset = () => {
    setName("");
    setDescription("");
    setQuestions([]);
    setCurrentText("");
    setSubmitted(false);
  };

  useEffect(() => {
    const quiz = {
      name,
      description,
      isPrivate,
      questions,
      currentText,
    };

    localStorage.setItem("quiz-draft", JSON.stringify(quiz));
  }, [name, description, questions, isPrivate, currentText]);

  const isValid = (): boolean => {
    return Boolean(name.length && description.length && questions.length);
  };

  if (!user || user.isAnonymous) {
    return null;
  }

  const renderLeftMargin = () => {
    return (
      <div
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
            onChange={(event) => {
              setName(event.target.value);
            }}
          />

          <TextField
            label="Description"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
          />

          <Dropdown
            label="Language"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
            }}
            options={languages.map(({ code, name, native }) => ({
              value: code,
              label: `${name} (${native})`,
            }))}
          />

          <label style={{ display: "block", marginTop: 20 }}>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={() => {
                setIsPrivate((prev) => !prev);
              }}
            />
            Make it private?
          </label>

          <h3>Questions</h3>

          {questions.map((question, index) => (
            <div
              key={question.properties.text}
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
              >{`Q${index + 1}: ${question.properties.text}`}</p>
              <button
                onClick={() => {
                  removeQuestion(index);
                }}
              >
                X
              </button>
            </div>
          ))}

          <TextField
            label={`Question ${questions.length + 1}:`}
            value={currentText}
            onChange={(event) => {
              const value = event.target.value;
              setCurrentText(value);
            }}
          />

          <p>Correct answer: </p>
          <div>{`Latitude: ${coordinates?.lat ?? "?"}`}</div>
          <div>{`Longitude: ${coordinates?.lng ?? "?"}`}</div>

          <Slider
            label={`Radius: ${formatDistance(radius)}`}
            max="100000"
            step="10"
            value={radius}
            style={{ width: "100%" }}
            onChange={(e) => {
              const value = Number(e.target.value);
              setRadius(value);
            }}
          />

          <Button
            type="button"
            variant="info"
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
    <div className={styles.create}>
      <Navbar />
      <Map
        initialViewState={{
          longitude: 0,
          latitude: 0,
          zoom: 2,
        }}
        style={{ height: "100vh" }}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        onClick={onMapClick}
      >
        {coordinates ? (
          <>
            <Marker latitude={coordinates.lat} longitude={coordinates.lng} />
            <Circle
              coordinates={{
                longitude: coordinates.lng,
                latitude: coordinates.lat,
              }}
              radius={radius}
            />
          </>
        ) : null}
        {questions.map((question, index) => (
          <Polygon feature={question} key={`polygon-${index}`} />
        ))}
      </Map>
      {renderLeftMargin()}
      <Modal visible={submitted}>
        <h2>Hooray!</h2>
        <p>Your quiz &quot;{name}&quot; has been successfully created.</p>
        <Button onClick={reset} type="submit" style={{ marginTop: 32 }}>
          Nice.
        </Button>
      </Modal>
    </div>
  );
}
