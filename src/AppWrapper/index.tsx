import React from "react";

import Navbar from "../Navbar";

import styles from "./AppWrapper.module.css";

interface Props {
  children: React.ReactNode;
}

export default function AppWrapper(props: Props) {
  return (
    <div>
      <Navbar />
      <div className={styles.children}>{props.children}</div>
    </div>
  );
}
