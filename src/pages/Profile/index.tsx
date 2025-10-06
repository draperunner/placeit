import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/Button";
import TextField from "../../components/TextField";

import { useUser } from "../../auth";
import { usePrevious } from "../../utils";

import { getAuth, signOut, updateProfile } from "firebase/auth";

export default function Profile() {
  const user = useUser();
  const navigate = useNavigate();

  const previousUser = usePrevious(user);

  const [email, setEmail] = useState<string>(user?.email || "");
  const [name, setName] = useState<string>(user?.displayName || "");

  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>("");
  const [error, setError] = useState<string>("");

  const login = () => {
    return navigate("/login");
  };

  const logout = () => {
    return signOut(getAuth());
  };

  useEffect(() => {
    if (!previousUser && user) {
      setName(user.displayName || "");
      setEmail(user.email || "");
    }
  }, [previousUser, user]);

  const updateProfileInfo = () => {
    if (!user) return;

    setLoading(true);
    setFeedback("");
    setError("");

    updateProfile(user, {
      displayName: name,
    })
      .then(() => {
        setFeedback(`Profile updated! Your new name is ${name}. Cool!`);
      })
      .catch(() => {
        setError("Something went wrong. Could not update the profile.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFeedback("");
      setError("");
    }, 5000);

    return () => {
      clearTimeout(timeout);
    };
  }, [feedback, error]);

  if (!user || user.isAnonymous) {
    return (
      <div>
        <h1>Profile</h1>
        <Button onClick={login}>Log in?</Button>
      </div>
    );
  }

  return (
    <div>
      <h1>Profile</h1>
      <h2>{user.displayName}</h2>
      <TextField
        disabled
        label="Email"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
        }}
      />
      <TextField
        label="Display Name"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
        }}
        maxLength={32}
      />
      <Button
        style={{ marginTop: 20, marginRight: 20 }}
        onClick={updateProfileInfo}
        loading={loading}
      >
        Update profile
      </Button>
      <Button variant="info" style={{ marginTop: 20 }} onClick={logout}>
        Log out
      </Button>

      <div role="alert">
        {error ? <p style={{ color: "red" }}>{error}</p> : null}
      </div>

      <div>{feedback ? <p>{feedback}</p> : null}</div>
    </div>
  );
}
