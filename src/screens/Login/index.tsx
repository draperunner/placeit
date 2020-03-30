import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import firebase from "firebase";

import Button from "../../components/Button";
import TextField from "../../components/TextField";

import { usePrevious } from "../../utils";

import "./styles.css";

async function sendVerificationEmail(user: firebase.User | null) {
  try {
    if (!user) return;
    await user.sendEmailVerification();
    console.log("sendEmailVerification success");
  } catch (error) {
    console.log("sendEmailVerification error");
    console.error(error);
  }
}

export default function Login() {
  const history = useHistory();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [needsVerification, setNeedsVerification] = useState<boolean>(false);

  const [user, setUser] = useState<firebase.User | null>(null);
  const previousUser = usePrevious(user);

  useEffect(() => {
    if (!previousUser && user && user.email && !user.emailVerified) {
      setNeedsVerification(true);
    }
  }, [previousUser, user]);

  const onLoginSuccess = (usr: firebase.User | null) => {
    if (!usr) return;

    setUser(usr);

    if (!usr.emailVerified) {
      setNeedsVerification(true);
      sendVerificationEmail(usr);
      return;
    }

    history.push("/profile");
  };

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
      .then(({ user }) => {
        onLoginSuccess(user);
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
              onLoginSuccess(user);
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

  if (needsVerification) {
    return (
      <div className="login">
        <h1>Please verify your email.</h1>
        <p>
          We sent an email to {user?.email}. You need to verify your email
          before you can start using your account.
        </p>
        <Button onClick={() => sendVerificationEmail(user)}>
          Resend verification email
        </Button>
      </div>
    );
  }

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
