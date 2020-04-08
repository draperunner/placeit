import React from "react";
import { Link } from "react-router-dom";

import Button from "../../components/Button";

import image from "./mapquiz.jpg";

import "./styles.css";

export default function Home() {
  return (
    <div className="home">
      <h1>Place it!</h1>
      <p>Get closest to the right answer – in meters!</p>
      <Button as={Link} to="/host" style={{ margin: 10, marginTop: 100 }}>
        Host a quiz!
      </Button>
      <Button as={Link} to="/create" style={{ margin: 10, marginTop: 100 }}>
        Create a quiz!
      </Button>

      <img className="cover-photo" src={image} alt="Cover" />
    </div>
  );
}
