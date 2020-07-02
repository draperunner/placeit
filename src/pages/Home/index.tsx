import React from "react";
import { Link } from "react-router-dom";

import Button from "../../components/Button";

import Blob from "./Blob";
import Pin from "./Pin";

import "./styles.css";

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
        <Blob className="home__island" />
        <Pin className="home__pin" color="#EB144C" />
      </div>
      {/* <img className="home__pin" src={pin} alt="Pin" /> */}
    </div>
  );
}