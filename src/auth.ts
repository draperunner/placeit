import { createContext, useContext, useState, useEffect } from "react";
import firebase from "firebase/app";

import "firebase/analytics";
import "firebase/auth";

import { User } from "./interfaces";

const firebaseConfig = {
  apiKey: "AIzaSyBNbMx3Ms2tVig-TyK68lUfJ9s0Q9SYr-o",
  authDomain: "mapquiz-app.firebaseapp.com",
  databaseURL: "https://mapquiz-app.firebaseio.com",
  projectId: "mapquiz-app",
  storageBucket: "mapquiz-app.appspot.com",
  messagingSenderId: "899228748450",
  appId: "1:899228748450:web:94d0c98ab7bde22cb765fb",
  measurementId: "G-YGM7LFFP6C",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

export function useAnonymousLogin() {
  const [user, setUser] = useState<any>();
  const [token, setToken] = useState<string | null>();

  useEffect(() => {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) {
        setUser(null);
        setToken(null);
        firebase.auth().signInAnonymously().catch(console.error);
        return;
      }

      setUser(user);

      user.getIdToken().then(setToken).catch(console.error);
    });
  }, []);

  return {
    user,
    token,
  };
}

export const UserContext = createContext<User | null>(null);

export const useUser = () => useContext(UserContext);
