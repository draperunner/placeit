import React from "react";

import "./styles.css";

interface Props {
  loading?: boolean;
  mode?: "success" | "warning";
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
  const { as, loading, variant = "success", children, ...restProps } = props;

  const Comp = props.as || "button";

  return (
    <Comp
      disabled={loading}
      {...restProps}
      className={`button button--${variant} ${props.className || ""}`}
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
