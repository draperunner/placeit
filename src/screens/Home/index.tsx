import React from "react";
import { Link } from "react-router-dom";

import Button from "../../components/Button";

import "./styles.css";

export default function Home() {
  return (
    <div className="home">
      <h1>Map Quiz</h1>
      <p>Get closest to the right answer – in meters!</p>
      <Button as={Link} to="/host" style={{ marginTop: 100 }}>
        Host a quiz!
      </Button>
      <Button as={Link} to="/create" style={{ marginTop: 100 }}>
        Create a quiz!
      </Button>
    </div>
  );
}
