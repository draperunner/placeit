import React from "react";

import styles from "./TextField.module.css";

interface Props extends React.ComponentPropsWithoutRef<"input"> {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function TextField(props: Props) {
  const { label, style, className, ...restProps } = props;
  return (
    <label className={`${styles.textField} ${className || ""}`} style={style}>
      {label}
      <input type="text" {...restProps} />
    </label>
  );
}
