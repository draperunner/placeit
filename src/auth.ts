import { createContext, useContext, useState, useEffect } from "react";
import { getAuth, signInAnonymously, User } from "firebase/auth";
import { initializeApp } from "firebase/app";

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
initializeApp(firebaseConfig);

export function useAnonymousLogin() {
  const [user, setUser] = useState<User | null | undefined>();
  const [token, setToken] = useState<string | null | undefined>();

  useEffect(() => {
    const auth = getAuth();

    return auth.onAuthStateChanged((user) => {
      setUser(user);

      if (!user) {
        setToken(null);
        signInAnonymously(auth).catch(console.error);
        return;
      }

      user.getIdToken().then(setToken).catch(console.error);
    });
  }, []);

  return {
    user,
    token,
  };
}

export const UserContext = createContext<User | null | undefined>(null);

export const useUser = () => useContext(UserContext);
