import type React from "react";
import styles from "./Button.module.css";

// Button specific props (not coming from the underlying element)
interface ButtonOwnProps {
  loading?: boolean;
  variant?: "success" | "info" | "warning";
}

// Generic polymorphic prop helper
type AsProp<C extends React.ElementType> = {
  as?: C;
};

// Props from the underlying element, excluding those we override in our own props
type PolymorphicComponentProps<C extends React.ElementType, P> = P &
  AsProp<C> &
  Omit<React.ComponentPropsWithoutRef<C>, keyof P | "as">;

// Public Button props type
export type ButtonProps<C extends React.ElementType = "button"> =
  PolymorphicComponentProps<C, ButtonOwnProps>;

function LoadingDots({ active }: { active?: boolean }) {
  return (
    <div
      className={`${styles.buttonLoading} ${active ? styles.buttonLoadingActive : ""}`}
    >
      <div className={styles.loadingDot} style={{ animationDelay: "100ms" }} />
      <div className={styles.loadingDot} style={{ animationDelay: "200ms" }} />
      <div className={styles.loadingDot} style={{ animationDelay: "300ms" }} />
    </div>
  );
}

export default function Button<C extends React.ElementType = "button">(
  props: ButtonProps<C>,
) {
  const {
    as,
    loading,
    variant = "success",
    children,
    className,
    ...restProps
  } = props;

  const Comp = as || "button";

  return (
    <Comp
      // disabled prop only applied when the underlying element supports it (e.g., button)
      {...(typeof Comp === "string" && Comp === "button"
        ? { disabled: loading }
        : {})}
      {...restProps}
      className={`${styles.button} ${styles[variant]} ${className || ""}`}
    >
      <div
        className={`${styles.buttonChildren} ${
          loading ? styles.buttonChildrenLoading : ""
        }`}
      >
        {children}
      </div>
      <LoadingDots active={loading} />
    </Comp>
  );
}
