import React from "react";

import Navbar from "../Navbar";

import styles from "./AppWrapper.module.css";

interface Props {
  backgroundColor?: string;
  children: React.ReactNode;
}

export default function AppWrapper(props: Props) {
  return (
    <div
      style={{
        backgroundColor: props.backgroundColor || "#f9f9f9",
        minHeight: "100vh",
      }}
    >
      <Navbar />
      <div className={styles.children}>{props.children}</div>
    </div>
  );
}
