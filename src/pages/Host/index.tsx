import { useState, useCallback, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "firebase/firestore";

import Button from "../../components/Button";

import { Quiz } from "../../interfaces";
import { useUser } from "../../auth";
import { post } from "../../http";
import { getLanguageName } from "../../utils";

import {
  collection,
  getDocs,
  getFirestore,
  query,
  QuerySnapshot,
  where,
} from "firebase/firestore";
import { SESSIONS_URL } from "../../constants";
import styles from "./Host.module.css";

async function createQuizSession(quizId: string) {
  const { session } = await post<{ session: { id: string } }>(SESSIONS_URL, {
    quizId,
    map: "STANDARD",
    hostParticipates: true,
  });

  return session.id;
}

const db = getFirestore();

function docsToData<T>(docs: QuerySnapshot): T[] {
  const dataArray: T[] = [];

  docs.forEach((doc) => {
    const data = doc.data() as T;
    const id = doc.id;
    dataArray.push({ ...data, id });
  });

  return dataArray;
}

export default function Host() {
  const user = useUser();
  const navigate = useNavigate();
  const [publicQuizzes, setPublicQuizzes] = useState<Quiz[] | undefined>();
  const [personalQuizzes, setPersonalQuizzes] = useState<Quiz[] | undefined>();
  const [quiz, setQuiz] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;

    const collectionRef = collection(db, "quizzes");

    void Promise.all([
      getDocs(
        query(
          collectionRef,
          where("author.uid", "!=", user.uid),
          where("isPrivate", "==", false),
        ),
      ),
      getDocs(query(collectionRef, where("author.uid", "==", user.uid))),
    ]).then(([publicQuizRefs, personalQuizRefs]) => {
      setPublicQuizzes(docsToData<Quiz>(publicQuizRefs));
      setPersonalQuizzes(docsToData<Quiz>(personalQuizRefs));
    });
  }, [user]);

  const onCreateQuiz = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!quiz) {
        alert("You need to choose a quiz!");
        return;
      }

      try {
        setLoading(true);
        const id = await createQuizSession(quiz);
        await navigate(`/q/${id}`);
      } finally {
        setLoading(false);
      }
    },
    [navigate, quiz],
  );

  return (
    <div className={styles.host}>
      <h1>Select a Quiz</h1>

      <form onSubmit={onCreateQuiz}>
        {!publicQuizzes ? <p>Loading quizzes...</p> : null}

        {personalQuizzes?.length ? (
          <>
            <h2>Your quizzes</h2>
            <div className={styles.quizRadioGroup}>
              {personalQuizzes.map((q) => (
                <label
                  key={q.id}
                  className={`${styles.quizRadio} ${
                    quiz === q.id ? styles.quizRadioSelected : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="pick-quiz"
                    value={q.name}
                    onChange={() => {
                      setQuiz(q.id);
                    }}
                  />
                  <b>{q.name}</b>
                  <i>by {q.author.name}</i>
                  <p>{q.description}</p>
                  <p>Language: {getLanguageName(q.language)}</p>
                  <p>{q.isPrivate ? "Private." : "Public."}</p>
                </label>
              ))}
            </div>
          </>
        ) : null}

        {publicQuizzes?.length ? (
          <>
            {personalQuizzes?.length ? <h2>Public quizzes</h2> : null}
            <div className={styles.quizRadioGroup}>
              {publicQuizzes.map((q) => (
                <label
                  key={q.id}
                  className={`${styles.quizRadio} ${
                    quiz === q.id ? styles.quizRadioSelected : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="pick-quiz"
                    value={q.name}
                    onChange={() => {
                      setQuiz(q.id);
                    }}
                  />
                  <b>{q.name}</b>
                  <i>by {q.author.name}</i>
                  <p>{q.description}</p>
                  <p>
                    {`${q.questions.length} questions. ${getLanguageName(q.language)}.`}
                  </p>
                </label>
              ))}
            </div>
          </>
        ) : null}

        <Button loading={loading} type="submit" className={styles.submitButton}>
          Host it!
        </Button>
      </form>
    </div>
  );
}
