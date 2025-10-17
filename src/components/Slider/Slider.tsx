import React, { ComponentPropsWithoutRef } from "react";

import styles from "./Slider.module.css";
import { classNames } from "../../utils";

type Props = ComponentPropsWithoutRef<"input"> & {
  label: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  labelProps?: ComponentPropsWithoutRef<"label">;
};

export default function Slider(props: Props) {
  const { label, style, className, labelProps, ...restProps } = props;
  return (
    <label
      className={classNames(styles.label, className)}
      style={style}
      {...labelProps}
    >
      {label}
      <input type="range" className={styles.slider} {...restProps} />
    </label>
  );
}
