import React from "react";

import "./styles.css";

interface Props {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  [key: string]: any;
}

export default function TextField(props: Props) {
  const { label, style, className, ...restProps } = props;
  return (
    <label className={`text-field ${className || ""}`} style={style}>
      {label}
      <input type="text" {...restProps} />
    </label>
  );
}
