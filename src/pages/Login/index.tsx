import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/Button";
import TextField from "../../components/TextField";

import { usePrevious } from "../../utils";

import {
  EmailAuthProvider,
  getAuth,
  linkWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword,
  User,
} from "firebase/auth";

async function sendVerificationEmail(user: User | null) {
  try {
    if (!user) return;
    await sendEmailVerification(user);
    console.log("sendEmailVerification success");
  } catch (error) {
    console.log("sendEmailVerification error");
    console.error(error);
  }
}

function isAuthError(error: unknown): error is { code: string } {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [needsVerification, setNeedsVerification] = useState<boolean>(false);

  const [user, setUser] = useState<User | null>(null);
  const previousUser = usePrevious(user);

  useEffect(() => {
    if (!previousUser && user && user.email && !user.emailVerified) {
      setNeedsVerification(true);
    }
  }, [previousUser, user]);

  const onLoginSuccess = async (usr: User | null) => {
    if (!usr) return;

    setUser(usr);

    if (!usr.emailVerified) {
      setNeedsVerification(true);
      await sendVerificationEmail(usr);
      return;
    }

    await navigate("/profile");
  };

  const upgradeUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setError("Both email and password are needed!");
      return;
    }

    const currentUser = getAuth().currentUser;

    if (!currentUser) {
      console.log("No currentUser");
      return;
    }

    const credential = EmailAuthProvider.credential(email, password);

    linkWithCredential(currentUser, credential)
      .then(({ user }) => onLoginSuccess(user))
      .catch((error: unknown) => {
        if (
          isAuthError(error) &&
          (error.code === "auth/email-already-in-use" ||
            error.code === "auth/provider-already-linked")
        ) {
          signInWithEmailAndPassword(getAuth(), email, password)
            .then(({ user }) => onLoginSuccess(user))
            .catch((err: unknown) => {
              if (isAuthError(err)) {
                setError(err.code);
              } else {
                setError("Unknown error");
              }
            });
        } else if (isAuthError(error)) {
          console.log("Error upgrading anonymous account", error);
          setError(error.code);
        }
      });
  };

  if (needsVerification) {
    return (
      <div>
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
    <form onSubmit={upgradeUser}>
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

      <TextField
        label="Password"
        value={password}
        type="password"
        onChange={(event) => {
          setPassword(event.target.value);
        }}
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
