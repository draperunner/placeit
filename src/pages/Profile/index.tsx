import React, { useState, useEffect } from "react";
import firebase from "firebase/app";
import { useHistory } from "react-router-dom";

import Button from "../../components/Button";
import TextField from "../../components/TextField";

import { useUser } from "../../auth";
import { usePrevious } from "../../utils";

import "./styles.css";

export default function Profile() {
  const user = useUser();
  const history = useHistory();

  const previousUser = usePrevious(user);

  const [email, setEmail] = useState<string>(user?.email || "");
  const [name, setName] = useState<string>(user?.displayName || "");

  const login = () => {
    return history.push("/login");
  };

  const logout = () => {
    return firebase.auth().signOut();
  };

  useEffect(() => {
    if (!previousUser && user) {
      setName(user.displayName || "");
      setEmail(user.email || "");
    }
  }, [previousUser, user]);

  const updateProfile = () => {
    if (!user) return;
    user
      .updateProfile({
        displayName: name,
        photoURL: null,
      })
      .then(function () {})
      .catch(function (error) {
        console.error(error);
      });
  };

  if (!user || user.isAnonymous) {
    return (
      <div className="profile">
        <h1>Profil</h1>
        <Button onClick={login}>Log in?</Button>
      </div>
    );
  }

  return (
    <div className="profile">
      <h1>Profil</h1>
      <h2>{user.displayName}</h2>
      <TextField
        disabled
        label="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="Display Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Button
        style={{ marginTop: 20, marginRight: 20 }}
        onClick={updateProfile}
      >
        Update profile
      </Button>
      <Button style={{ marginTop: 20 }} onClick={logout}>
        Log out
      </Button>
    </div>
  );
}
