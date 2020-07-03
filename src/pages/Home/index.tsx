import React from "react";
import { Link } from "react-router-dom";

import Button from "../../components/Button";

import Blob from "./Blob";
import Pin from "./Pin";

import "./styles.css";

const blobSeed = Math.random();

export default function Home() {
  return (
    <div className="home">
      <h1>Place it!</h1>
      <p>Get closest to the right answer – in meters!</p>
      <Button as={Link} to="/host" className="home__button">
        Host a quiz!
      </Button>
      <Button as={Link} to="/create" className="home__button">
        Create a quiz!
      </Button>

      <div className="home__illustration">
        <Blob
          className="home__island"
          seed={blobSeed}
          extraPoints={6}
          randomness={30}
          size={100}
        />
        <Pin className="home__pin" color="#EB144C" />
      </div>
    </div>
  );
}
