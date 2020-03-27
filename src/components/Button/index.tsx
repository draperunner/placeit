import React from "react";

import "./styles.css";

interface Props {
  [key: string]: any;
}

export default function Button(props: Props) {
  const Comp = props.as || "button";
  return <Comp {...props} className={`button ${props.className || ""}`} />;
}
