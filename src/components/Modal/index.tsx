import { ReactNode } from "react";

import styles from "./Modal.module.css";

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
      <div className={styles.modalBackdrop} />
      <div {...restProps} className={`${styles.modal} ${className || ""}`}>
        {children}
      </div>
    </>
  );
}
