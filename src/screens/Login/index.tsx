import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import firebase from "firebase";

import Button from "../../components/Button";
import TextField from "../../components/TextField";

import "./styles.css";

export default function Login() {
  const history = useHistory();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");

  const upgradeUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setError("Both email and password are needed!");
      return;
    }

    const credential = firebase.auth.EmailAuthProvider.credential(
      email,
      password
    );

    const currentUser = firebase.auth().currentUser;

    if (!currentUser) {
      console.log("No currentUser");
      return;
    }

    currentUser
      .linkWithCredential(credential)
      .then((usercred) => {
        history.push("/profile");
      })
      .catch(function (error) {
        if (
          error.code === "auth/email-already-in-use" ||
          error.code === "auth/provider-already-linked"
        ) {
          firebase
            .auth()
            .signInWithEmailAndPassword(email, password)
            .then(({ user }) => {
              history.push("/profile");
            })
            .catch((err) => {
              setError(err.code);
            });
        } else {
          console.log("Error upgrading anonymous account", error);
          setError(error.code);
        }
      });
  };

  return (
    <form className="login" onSubmit={upgradeUser}>
      <h1>You need to log in.</h1>
      <p>
        In order to create new awesome quizzes, you need a good, old user
        profile.
      </p>

      <TextField
        label="Email"
        value={email}
        type="email"
        onChange={(event) => setEmail(event.target.value)}
      />

      <TextField
        label="Password"
        value={password}
        type="password"
        onChange={(event) => setPassword(event.target.value)}
      />

      {error ? (
        <div role="alert">
          <p style={{ color: "red" }}>{error}</p>
        </div>
      ) : null}

      <Button style={{ marginTop: 20 }} type="submit">
        Sign up or in
      </Button>
    </form>
  );
}
