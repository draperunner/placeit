import "./styles.css";
import type React from "react";

// Button specific props (not coming from the underlying element)
interface ButtonOwnProps {
  loading?: boolean;
  variant?: "success" | "warning";
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
    <div className={`button-loading ${active ? "button-loading--active" : ""}`}>
      <div
        className="button-loading__dot"
        style={{ animationDelay: "100ms" }}
      />
      <div
        className="button-loading__dot"
        style={{ animationDelay: "200ms" }}
      />
      <div
        className="button-loading__dot"
        style={{ animationDelay: "300ms" }}
      />
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
      className={`button button--${variant} ${className || ""}`}
    >
      <div
        className={`button__children ${
          loading ? "button__children--loading" : ""
        }`}
      >
        {children}
      </div>
      <LoadingDots active={loading} />
    </Comp>
  );
}
