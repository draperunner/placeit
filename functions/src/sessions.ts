import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express, { Request, Response, NextFunction } from "express";
import haversine from "haversine";

import cors from "./cors";
import { Quiz, QuizSession, QuizState } from "./interfaces";
import { verifyToken } from "./auth";
import { ANSWER_TIME_LIMIT, ANSWER_TIME_SLACK } from "./constants";

const app = express();
app.use(cors);

const db = admin.firestore();

enum Collections {
  QUIZZES = "quizzes",
  QUIZ_SESSIONS = "quiz-sessions",
  QUIZ_STATES = "quiz-states",
}

enum Map {
  STANDARD = "STANDARD",
  DARK_MATTER = "DARK_MATTER",
  WATERCOLOR = "WATERCOLOR",
  TONER_LITE = "TONER_LITE",
  VOYAGER = "VOYAGER",
  VOYAGER_NO_LABELS = "VOYAGER_NO_LABELS",
}

interface MapData {
  name: string;
  author: string;
  url: string;
  attribution: string;
}

function getMapData(map: string): MapData {
  switch (map) {
    case Map.WATERCOLOR: {
      return {
        name: "Watercolor",
        author: "Stamen",
        attribution:
          'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        url:
          "https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg",
      };
    }
    case Map.VOYAGER: {
      return {
        name: "Voyager",
        author: "CARTO",
        url:
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      };
    }
    case Map.VOYAGER_NO_LABELS: {
      return {
        name: "Voyager No Labels",
        author: "CARTO",
        url:
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      };
    }
    case Map.DARK_MATTER: {
      return {
        name: "Dark Matter",
        author: "CARTO",
        attribution:
          'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      };
    }

    case Map.TONER_LITE: {
      return {
        name: "Toner Lite",
        author: "Stamen",
        attribution:
          'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        url:
          "https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png",
      };
    }

    case Map.STANDARD:
    default:
      return {
        name: "Mapnik",
        author: "OpenStreetMap",
        url: "https://{s}.tile.osm.org/{z}/{x}/{y}.png",
        attribution:
          '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors',
      };
  }
}

async function getQuizSession(id: string): Promise<QuizSession | null> {
  const doc = await db.collection("quiz-sessions").doc(id).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as QuizSession;
}

async function getQuizState(id: string): Promise<QuizState | null> {
  const doc = await db.collection("quiz-states").doc(id).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as QuizState;
}

function calculateDistance(
  correctAnswer: admin.firestore.GeoPoint,
  givenAnswer: { latitude: number; longitude: number }
): number {
  return haversine(
    {
      latitude: correctAnswer.latitude,
      longitude: correctAnswer.longitude,
    },
    givenAnswer,
    { unit: "meter" }
  );
}

function getDeadline(
  answerTimeLimit = ANSWER_TIME_LIMIT
): admin.firestore.Timestamp {
  const deadline = new Date().getTime() + answerTimeLimit * 1000;
  return admin.firestore.Timestamp.fromMillis(deadline);
}

app.post("/:id/answer", verifyToken(), async (req, res, next) => {
  try {
    const now = new Date();
    const id = req.params.id;

    // @ts-ignore
    const currentUserUid = req.user.uid;

    if (!req.body || !req.body.latitude || !req.body.longitude) {
      throw new Error("There are no coordinates in body");
    }

    const quizSession = await getQuizSession(id);

    if (!quizSession) {
      throw new Error("Quiz session does not exist");
    }

    if (quizSession.state !== "in-progress") {
      throw new Error("Cannot answer in a quiz that has not started.");
    }

    if (!quizSession.participants.some(({ uid }) => uid === currentUserUid)) {
      throw new Error("User is not participating in this quiz session.");
    }

    const { currentQuestion } = quizSession;

    if (!currentQuestion) {
      throw new Error(
        "Current question is undefined, although quiz has started."
      );
    }

    const diff = currentQuestion.deadline.toMillis() - now.getTime();
    if (diff < ANSWER_TIME_SLACK * -1000) {
      throw new Error(`Answered too late: ${diff} ms`);
    }

    const quizState = await getQuizState(id);

    if (!quizState) {
      throw new Error("Quiz state does not exist");
    }

    const { givenAnswers } = quizState;

    const givenAnswersForThisQuestion = givenAnswers.filter(
      ({ questionId }) => questionId === currentQuestion.id
    );

    const participantsThatHaveAnswered = givenAnswersForThisQuestion.map(
      ({ participantId }) => participantId
    );

    if (participantsThatHaveAnswered.includes(currentUserUid)) {
      throw new Error("User has already answered this question!");
    }

    if (quizState.currentCorrectAnswer.questionId !== currentQuestion.id) {
      throw new Error(
        "The quiz state current answer is not for the current question"
      );
    }

    const distance = calculateDistance(
      quizState.currentCorrectAnswer.correctAnswer,
      req.body
    );

    const givenAnswer = {
      questionId: currentQuestion.id,
      participantId: currentUserUid,
      answer: req.body,
      distance,
      timestamp: admin.firestore.Timestamp.fromDate(now),
    };

    db.collection(Collections.QUIZ_STATES)
      .doc(id)
      .update({
        givenAnswers: admin.firestore.FieldValue.arrayUnion(givenAnswer),
      });

    res.json({});
  } catch (error) {
    next(error);
  }
});

app.post("/:id/next-question", verifyToken(), async (req, res, next) => {
  try {
    const id = req.params.id;

    // @ts-ignore
    const currentUserUid = req.user.uid;

    const quizSession = await getQuizSession(id);

    if (!quizSession) {
      throw new Error("Quiz session does not exist");
    }

    if (!quizSession.host.uid === currentUserUid) {
      throw new Error("Only the host can go to next question");
    }

    const quizRef = await db
      .collection(Collections.QUIZZES)
      .doc(quizSession.quizDetails.id)
      .get();

    const quiz = quizRef.data() as Quiz;

    if (!quiz) {
      console.log("Quiz does not exist");
      return;
    }

    const currentQuestionId = quizSession.currentQuestion?.id || -1;
    const currentQuestionIndex = quiz.questions.findIndex(
      (question) => question.id === currentQuestionId
    );

    if (
      currentQuestionIndex < 0 ||
      currentQuestionIndex === quiz.questions.length - 1
    ) {
      throw new Error(
        "There are no more questions. We should be done already."
      );
    }

    const nextQuestion = quiz.questions[currentQuestionIndex + 1];

    db.collection(Collections.QUIZ_STATES)
      .doc(id)
      .update({
        currentCorrectAnswer: {
          questionId: nextQuestion.id,
          correctAnswer: nextQuestion.correctAnswer,
        },
      });

    db.collection(Collections.QUIZ_SESSIONS)
      .doc(id)
      .update({
        currentQuestion: {
          id: nextQuestion.id,
          text: nextQuestion.text,
          deadline: getDeadline(quizSession.answerTimeLimit),
        },
      });

    res.json({});
  } catch (error) {
    next(error);
  }
});

app.post("/", verifyToken(), async (req, res, next) => {
  try {
    const {
      hostName,
      quizId,
      map,
      hostParticipates,
      answerTimeLimit = 20,
    } = req.body;

    if (!hostName || typeof hostName !== "string") {
      throw new Error("`hostName` is invalid.");
    }

    if (!map || typeof map !== "string") {
      throw new Error("`map` is invalid.");
    }

    // @ts-ignore
    const uid = req.user.uid;

    const quizRef = await db.collection(Collections.QUIZZES).doc(quizId).get();

    if (!quizRef || !quizRef.exists) {
      throw new Error("Could not find quiz with this ID.");
    }

    const quiz = quizRef.data() as Quiz;

    if (!quiz) {
      throw new Error("Could not find quiz with this ID.");
    }

    const quizAuthor = await admin.auth().getUser(quiz.author.uid);

    const quizDetails = {
      id: quizId,
      name: quiz.name,
      description: quiz.description,
      language: quiz.language,
      numberOfQuestions: quiz.questions.length,
      author: {
        uid: quizAuthor.uid,
        name: quizAuthor.displayName,
      },
    };

    const docRef = await db.collection("quiz-sessions").add({
      host: {
        uid,
        name: hostName,
      },
      quizDetails,
      participants: hostParticipates
        ? [
            {
              uid,
              name: hostName,
            },
          ]
        : [],
      state: "lobby",
      map: getMapData(map),
      answerTimeLimit,
      chat: {
        messages: [],
      },
    });

    res.status(201).json({
      session: {
        id: docRef.id,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/:id/join", verifyToken(), async (req, res, next) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const { uid } = req.user;
    const { name } = req.body;

    await db
      .collection("quiz-sessions")
      .doc(id)
      .update({
        participants: admin.firestore.FieldValue.arrayUnion({
          uid,
          name,
        }),
      });
    res.json({});
  } catch (error) {
    next(error);
  }
});

app.post("/:id/start", verifyToken(), async (req, res, next) => {
  try {
    const { id } = req.params;

    await db.collection("quiz-sessions").doc(id).update({
      state: "in-progress",
    });
    res.json({});
  } catch (error) {
    next(error);
  }
});

function getMessage(message: string, authorName: string): string {
  if (Math.random() < 0.1) return message;

  const MESSAGES = [
    "Hello friends! 👋",
    "I AM ZORG, THE MAP QUIZ GOD OF THE PLANET XTURGOTH 3000. I WILL CRUSH YOU IN THIS SILLY HUMAN GAME.",
    `Hi! I am "${authorName}". That's not my real name, though. My real name is actually Flompy Flompwaters. Maybe you knew that already.`,
    "Howdy partners! 🤠",
    "Oh, baby don't hurt me.",
    "Hey! 👋 I am ready!",
    "Hello. I am very familiar with maps. In fact, my father was a map.",
    "OMG. A chat. All games have chats. Why do I need to chat?! 🤮",
    `Hi everyone! This is your President ${authorName}. I have arrived!`,
    `The following message is presented by Acme Inc: "${message}".`,
    message.toUpperCase(),
    "👏" + message.split(/\s/).join("👏") + "👏",
  ];

  const randomIndex = Math.floor(Math.random() * MESSAGES.length);
  return MESSAGES[randomIndex];
}

app.post("/:id/chat", verifyToken(), async (req, res, next) => {
  try {
    // @ts-ignore
    const { uid } = req.user;
    const { id } = req.params;
    const { author, message } = req.body;

    await db
      .collection("quiz-sessions")
      .doc(id)
      .update({
        "chat.messages": admin.firestore.FieldValue.arrayUnion({
          author: {
            uid,
            name: author?.name || "Unknown",
          },
          message: getMessage(message, author.name),
          timestamp: admin.firestore.Timestamp.now(),
        }),
      });
    res.json({});
  } catch (error) {
    next(error);
  }
});

app.use("*", (req, res) => {
  res.status(404).json({ message: "Not Found" });
});

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ message: error.message });
});

export const sessions = functions.region("europe-west1").https.onRequest(app);
