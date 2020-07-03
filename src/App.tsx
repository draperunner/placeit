import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import "firebase/app";
import "firebase/firestore";

import { useAnonymousLogin, UserContext } from "./auth";

import AppWrapper from "./AppWrapper";

import Home from "./pages/Home";
import Host from "./pages/Host";
import Quiz from "./pages/Quiz";
import Login from "./pages/Login";
import Create from "./pages/Create";
import Profile from "./pages/Profile";

function App() {
  const { user } = useAnonymousLogin();
  return (
    <UserContext.Provider value={user}>
      <Router>
        <div>
          <Switch>
            <Route path="/q/:id">
              <Quiz />
            </Route>
            <Route path="/host">
              <AppWrapper>
                <Host />
              </AppWrapper>
            </Route>
            <Route path="/create">
              <Create />
            </Route>
            <Route path="/login">
              <AppWrapper>
                <Login />
              </AppWrapper>
            </Route>
            <Route path="/profile">
              <AppWrapper>
                <Profile />
              </AppWrapper>
            </Route>
            <Route path="/">
              <AppWrapper>
                <Home />
              </AppWrapper>
            </Route>
          </Switch>
        </div>
      </Router>
    </UserContext.Provider>
  );
}

export default App;
