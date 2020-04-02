import React, { ReactNode } from "react";

import "./styles.css";

interface Props {
  visible: boolean;
  className?: string;
  children: ReactNode;
}

export default function Modal(props: Props) {
  const { visible, className, children, ...restProps } = props;

  if (!visible) return null;

  return (
    <>
      <div className="modal__backdrop" />
      <div {...restProps} className={`modal ${className || ""}`}>
        {children}
      </div>
    </>
  );
}
