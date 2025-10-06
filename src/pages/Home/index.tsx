import { Link } from "react-router-dom";

import Button from "../../components/Button";

import Blob from "./Blob";
import Pin from "./Pin";

import styles from "./Home.module.css";

const blobSeed = Math.random();

export default function Home() {
  return (
    <div className={styles.home}>
      <h1>Place it!</h1>
      <p>Get closest to the right answer – in meters!</p>

      <div className={styles.buttons}>
        <Button as={Link} to="/host">
          Play now!
        </Button>
        <Button as={Link} to="/create" variant="info">
          Create your own quiz
        </Button>
      </div>

      <div className={styles.homeIllustration}>
        <Blob
          className={styles.homeIsland}
          seed={blobSeed}
          extraPoints={6}
          randomness={30}
          size={100}
        />
        <Pin className={styles.homePin} color="#EB144C" />
      </div>
    </div>
  );
}
