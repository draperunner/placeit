import React from "react";

import "./styles.css";

interface Props {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function TextField(props: Props) {
  return (
    <label className="text-field">
      {props.label}
      <input type="text" value={props.value} onChange={props.onChange} />
    </label>
  );
}
