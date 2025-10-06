import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/Button";
import TextField from "../../components/TextField";

import {
  ActionCodeSettings,
  getAuth,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
} from "firebase/auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [linkSent, setLinkSent] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    const auth = getAuth();

    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email: string | null = window.localStorage.getItem("emailForSignIn");
      if (!email) {
        email = window.prompt("Please provide your email for confirmation");
      }

      if (!email) {
        return;
      }

      signInWithEmailLink(auth, email, window.location.href)
        .then(() => {
          setSuccess(true);
        })
        .catch((error: unknown) => {
          console.error(error);
        })
        .finally(() => {
          void navigate("/login", { replace: true });
          window.localStorage.removeItem("emailForSignIn");
        });
    }
  }, [navigate]);

  const sendMagicLink = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) {
      setError("Email is needed!");
      return;
    }

    const actionCodeSettings: ActionCodeSettings = {
      url: `${window.location.origin}/login`,
      linkDomain: window.location.host,
      handleCodeInApp: true,
    };
    const auth = getAuth();

    sendSignInLinkToEmail(auth, email, actionCodeSettings)
      .then(() => {
        window.localStorage.setItem("emailForSignIn", email);
        setLinkSent(true);
      })
      .catch((error: unknown) => {
        console.error(error);
      });
  };

  if (success) {
    return (
      <div>
        <h1>Success!</h1>
        <p>You are now logged in.</p>

        <div style={{ display: "flex", gap: 16, marginTop: 32 }}>
          <Button variant="success" onClick={() => navigate("/create")}>
            Create a new quiz
          </Button>
          <Button variant="info" onClick={() => navigate("/profile")}>
            Go to profile
          </Button>
        </div>
      </div>
    );
  }

  if (linkSent) {
    return (
      <div>
        <h1>Login link sent!</h1>
        <p>Check your inbox for the login link.</p>
      </div>
    );
  }

  return (
    <form onSubmit={sendMagicLink}>
      <h1>You need to log in.</h1>
      <p>
        In order to create new awesome quizzes, you need a good, old user
        profile.
      </p>

      <TextField
        label="Email"
        value={email}
        type="email"
        onChange={(event) => {
          setEmail(event.target.value);
        }}
      />

      {error ? (
        <div role="alert">
          <p style={{ color: "red" }}>{error}</p>
        </div>
      ) : null}

      <Button style={{ marginTop: 20 }} type="submit">
        Get login link
      </Button>
    </form>
  );
}
