import React from "react";

import Navbar from "../Navbar";

import "./styles.css";

interface Props {
  children: React.ReactNode;
}

export default function AppWrapper(props: Props) {
  return (
    <div className="app-wrapper">
      <Navbar />
      <div className="app-wrapper__children">{props.children}</div>
    </div>
  );
}
