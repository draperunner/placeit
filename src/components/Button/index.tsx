import React from "react";

import "./styles.css";

interface Props {
  loading?: boolean;
  [key: string]: any;
}

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

export default function Button(props: Props) {
  const { as, loading, children, ...restProps } = props;

  const Comp = props.as || "button";

  return (
    <Comp
      disabled={loading}
      {...restProps}
      className={`button ${props.className || ""}`}
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
