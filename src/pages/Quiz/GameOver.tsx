import { Map } from "react-map-gl/maplibre";

import { QuizSession } from "../../interfaces";
import { User } from "firebase/auth";
import styles from "./GameOver.module.css";

interface Props {
  quiz: QuizSession;
  user: User | null | undefined;
}

const DEFAULT_VIEW = {
  latitude: 0,
  longitude: 0,
  zoom: 2,
};

export default function GameOver({ quiz }: Props) {
  const resultsToShow = quiz.results?.sort((a, b) => b.points - a.points) ?? [];

  return (
    <div>
      <Map
        mapStyle={quiz.map.url}
        initialViewState={DEFAULT_VIEW}
        style={{ height: "100vh" }}
      />
      <div className={styles.quizPanel}>
        <h1>Game Over</h1>
        <p>{`Congratulations! 🎉`}</p>
        <ol>
          {resultsToShow.map(({ participantId, points, name }) => (
            <li key={participantId} className={styles.listItem}>
              <div className={styles.userInfo}>
                <img
                  alt="Your answer"
                  height={40}
                  width={40}
                  className={styles.avatar}
                  src={`https://joesch.moe/api/v1/${participantId}`}
                />
                {name}
              </div>
              <div>{points} points</div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
