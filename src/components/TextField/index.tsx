import React from "react";

import "./styles.css";

interface Props {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  [key: string]: any;
}

export default function TextField(props: Props) {
  const { label } = props;
  return (
    <label className="text-field">
      {props.label}
      <input type="text" {...props} />
    </label>
  );
}
