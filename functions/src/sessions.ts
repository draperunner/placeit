import { onRequest } from "firebase-functions/v2/https";
import express, { Request, Response, NextFunction } from "express";
import haversine from "haversine";
import destination from "@turf/rhumb-destination";

import cors from "./cors.js";
import { GivenAnswer, Quiz, QuizSession, QuizState } from "./interfaces.js";
import { getUserContext, verifyToken } from "./auth.js";
import { ANSWER_TIME_LIMIT, ANSWER_TIME_SLACK } from "./constants.js";
import {
  FieldValue,
  GeoPoint,
  getFirestore,
  Timestamp,
  Transaction,
} from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import z from "zod";

const app = express();
app.use(cors);

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

function getMapData(map: Map): MapData {
  switch (map) {
    case Map.WATERCOLOR: {
      return {
        name: "Watercolor",
        author: "Stamen",
        attribution:
          'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        url: "https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg",
      };
    }
    case Map.VOYAGER: {
      return {
        name: "Voyager",
        author: "CARTO",
        url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      };
    }
    case Map.VOYAGER_NO_LABELS: {
      return {
        name: "Voyager No Labels",
        author: "CARTO",
        url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
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
        url: "https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png",
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

async function getQuizSession(
  id: string,
  transaction?: Transaction,
): Promise<QuizSession | null> {
  const db = getFirestore();
  const ref = db.collection("quiz-sessions").doc(id);
  const doc = transaction ? await transaction.get(ref) : await ref.get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as QuizSession;
}

async function getQuizState(
  id: string,
  transaction?: Transaction,
): Promise<QuizState | null> {
  const db = getFirestore();
  const ref = db.collection("quiz-states").doc(id);
  const doc = transaction ? await transaction.get(ref) : await ref.get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as QuizState;
}

function calculateDistance(
  correctAnswer: GeoPoint,
  givenAnswer: { latitude: number; longitude: number },
): number {
  return haversine(
    {
      latitude: correctAnswer.latitude,
      longitude: correctAnswer.longitude,
    },
    givenAnswer,
    { unit: "meter" },
  );
}

function getDeadline(answerTimeLimit = ANSWER_TIME_LIMIT): Timestamp {
  const deadline = new Date().getTime() + answerTimeLimit * 1000;
  return Timestamp.fromMillis(deadline);
}

const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

app.post("/:id/answer", verifyToken(), async (req, res, next) => {
  try {
    const db = getFirestore();
    const now = new Date();
    const id = req.params.id;

    const parsedBody = CoordinatesSchema.parse(req.body);

    const currentUserUid = getUserContext().uid;

    await db.runTransaction(async (transaction) => {
      const quizSession = await getQuizSession(id, transaction);

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
          "Current question is undefined, although quiz has started.",
        );
      }

      const diff = currentQuestion.deadline.toMillis() - now.getTime();
      if (diff < ANSWER_TIME_SLACK * -1000) {
        throw new Error(`Answered too late: ${diff} ms`);
      }

      const quizState = await getQuizState(id, transaction);

      if (!quizState) {
        throw new Error("Quiz state does not exist");
      }

      const { givenAnswers } = quizState;

      const givenAnswersForThisQuestion = givenAnswers.filter(
        ({ questionId }) => questionId === currentQuestion.id,
      );

      const participantsThatHaveAnswered = givenAnswersForThisQuestion.map(
        ({ participantId }) => participantId,
      );

      if (participantsThatHaveAnswered.includes(currentUserUid)) {
        throw new Error("User has already answered this question!");
      }

      if (quizState.currentCorrectAnswer.questionId !== currentQuestion.id) {
        throw new Error(
          "The quiz state current answer is not for the current question",
        );
      }

      const distance = calculateDistance(
        quizState.currentCorrectAnswer.correctAnswer,
        parsedBody,
      );

      const givenAnswer = {
        questionId: currentQuestion.id,
        participantId: currentUserUid,
        answer: parsedBody,
        distance,
        timestamp: Timestamp.fromDate(now),
      };

      transaction.update(db.collection(Collections.QUIZ_STATES).doc(id), {
        givenAnswers: FieldValue.arrayUnion(givenAnswer),
      });
    });

    res.json({});
  } catch (error) {
    next(error);
  }
});

app.post("/:id/next-question", verifyToken(), async (req, res, next) => {
  try {
    const id = req.params.id;
    const currentUserUid = getUserContext().uid;

    const db = getFirestore();

    await db.runTransaction(async (transaction) => {
      const [quizSession, quizState] = await Promise.all([
        getQuizSession(id, transaction),
        getQuizState(id, transaction),
      ]);

      if (!quizSession) {
        throw new Error("Quiz session does not exist");
      }

      if (!quizState) {
        throw new Error("Quiz state does not exist");
      }

      if (quizSession.host.uid !== currentUserUid) {
        throw new Error("Only the host can go to next question");
      }

      const quizRef = await transaction.get(
        db.collection(Collections.QUIZZES).doc(quizSession.quizDetails.id),
      );

      const quiz = quizRef.data() as Quiz;

      if (!quiz) {
        throw new Error(
          "This quiz does not exist. A mind-blowing error indeed!",
        );
      }

      const { currentCorrectAnswer } = quizState;
      const { currentQuestion, participants } = quizSession;

      if (!currentQuestion) {
        throw new Error("Huh. There is no currentQuestion. Strange.");
      }

      const currentQuestionIndex = quiz.questions.findIndex(
        (question) => question.id === currentQuestion.id,
      );

      if (currentQuestionIndex < 0) {
        throw new Error(
          "The current question is not part of this quiz's questions. What?",
        );
      }

      const { givenAnswers } = quizState;

      const givenAnswersForThisQuestion = givenAnswers.filter(
        ({ questionId }) => questionId === currentQuestion.id,
      );

      const participantsThatHaventAnswered = participants.filter(
        ({ uid }) =>
          !givenAnswersForThisQuestion.some(
            ({ participantId }) => participantId === uid,
          ),
      );

      // If not all participants have answered, they either dropped out or timed out somehow.
      // We need to assign some dummy answer so the quiz can continue.
      if (participantsThatHaventAnswered.length > 0) {
        const editedGivenAnswers = [...givenAnswers];

        const worstAnswer = [...givenAnswersForThisQuestion].sort(
          (a, b) => b.distance - a.distance,
        )[0] as GivenAnswer | undefined;

        participantsThatHaventAnswered.forEach(({ uid }) => {
          const distance = (worstAnswer?.distance || 10e6) * 2;
          const randomAnswerPoint = destination(
            [
              currentCorrectAnswer.correctAnswer.longitude,
              currentCorrectAnswer.correctAnswer.latitude,
            ],
            distance / 1000, // kilometers
            Math.random() * 360 - 180,
          );

          const latitude = Math.max(
            -90,
            Math.min(90, randomAnswerPoint.geometry.coordinates[1]),
          );

          const longitude = Math.max(
            -180,
            Math.min(180, randomAnswerPoint.geometry.coordinates[0]),
          );

          editedGivenAnswers.push({
            answer: new GeoPoint(latitude, longitude),
            distance,
            participantId: uid,
            questionId: currentQuestion.id,
          });
        });

        transaction.update(db.collection(Collections.QUIZ_STATES).doc(id), {
          givenAnswers: editedGivenAnswers,
        });

        return;
      }

      if (currentQuestionIndex === quiz.questions.length - 1) {
        throw new Error(
          "There are no more questions. We should be done already.",
        );
      }

      const nextQuestion = quiz.questions[currentQuestionIndex + 1];

      transaction.update(db.collection(Collections.QUIZ_STATES).doc(id), {
        currentCorrectAnswer: {
          questionId: nextQuestion.id,
          correctAnswer: nextQuestion.correctAnswer,
        },
      });

      transaction.update(db.collection(Collections.QUIZ_SESSIONS).doc(id), {
        currentQuestion: {
          id: nextQuestion.id,
          text: nextQuestion.text,
          deadline: getDeadline(quizSession.answerTimeLimit),
        },
      });
    });

    res.json({});
  } catch (error) {
    next(error);
  }
});

const SessionSchema = z.object({
  hostName: z.string().min(1),
  quizId: z.string().min(1),
  map: z.enum(Map),
  hostParticipates: z.boolean().optional(),
  answerTimeLimit: z.number().min(5).max(120).optional(),
});

app.post("/", verifyToken(), async (req, res, next) => {
  try {
    const {
      hostName,
      quizId,
      map,
      hostParticipates,
      answerTimeLimit = ANSWER_TIME_LIMIT,
    } = SessionSchema.parse(req.body);

    const uid = getUserContext().uid;

    const db = getFirestore();
    const quizRef = await db.collection(Collections.QUIZZES).doc(quizId).get();

    if (!quizRef || !quizRef.exists) {
      throw new Error("Could not find quiz with this ID.");
    }

    const quiz = quizRef.data() as Quiz;

    if (!quiz) {
      throw new Error("Could not find quiz with this ID.");
    }

    const quizAuthor = await getAuth().getUser(quiz.author.uid);

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

const JoinSchema = z.object({
  name: z.string().min(1),
});

app.post("/:id/join", verifyToken(), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { uid } = getUserContext();
    const { name } = JoinSchema.parse(req.body);

    const db = getFirestore();
    await db
      .collection("quiz-sessions")
      .doc(id)
      .update({
        participants: FieldValue.arrayUnion({
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
    const db = getFirestore();
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
    "What is love? Baby don't hurt me.",
    "Hey! 👋 I am ready!",
    "Hello. I am very familiar with maps. In fact, my father was a map.",
    "OMG. A chat. All games have chats. Why do I need to chat?! 🤮",
    `Hi everyone! This is your President ${authorName}. I have arrived!`,
    `Okay, it's a bit embarassing, but I'm just gonna go ahead and say it: "${message}".`,
    `Geography? Is this ... GEOGRAPHY!?!??! YAAAAAAAAAAAAASSSS!!!!!!`,
    `Wanna hear a fun fact? I just learned TODAY how to write this: "${message}".`,
    `Okay everybody, repeat after me: "${message}".`,
    `${message} 💩`,
    `${message}. ${message}? ${message.toUpperCase()} !!!`,
    `${authorName} has arrived!`,
    `Knock knock. Who's there? It's ${authorName}!`,
    message.toUpperCase(),
    "👏" + message.split(/\s/).join("👏") + "👏",
  ];

  const randomIndex = Math.floor(Math.random() * MESSAGES.length);
  return MESSAGES[randomIndex];
}

const ChatSchema = z.object({
  author: z.object({
    name: z.string().min(1),
  }),
  message: z.string().min(1),
});

app.post("/:id/chat", verifyToken(), async (req, res, next) => {
  try {
    const { uid } = getUserContext();
    const { id } = req.params;
    const { author, message } = ChatSchema.parse(req.body);

    await getFirestore()
      .collection("quiz-sessions")
      .doc(id)
      .update({
        "chat.messages": FieldValue.arrayUnion({
          author: {
            uid,
            name: author.name,
          },
          message: getMessage(message, author.name),
          timestamp: Timestamp.now(),
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

export const sessions2ndGen = onRequest(
  {
    maxInstances: 1,
    region: "europe-west1",
  },
  app,
);
