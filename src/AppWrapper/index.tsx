import React from "react";
import { Link } from "react-router-dom";

import { useUser } from "../auth";

import "./styles.css";

interface Props {
  children: React.ReactNode;
}

export default function AppWrapper(props: Props) {
  const user = useUser();

  return (
    <div className="app-wrapper">
      <nav>
        {window.location.pathname !== "/" ? (
          <Link to="/">Map Quiz</Link>
        ) : (
          <div />
        )}
        {user && !user.isAnonymous ? (
          <Link to="/profile">
            <img
              className="profile-img"
              src={
                user.photoURL ||
                `https://api.adorable.io/avatars/40/${user.uid}.png`
              }
              alt={user.displayName || "profile photo"}
            />
          </Link>
        ) : (
          <Link to="/login">Log in</Link>
        )}
      </nav>
      <div className="app-wrapper__children">{props.children}</div>
    </div>
  );
}
