import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import "firebase";
import "firebase/firestore";

import { useAnonymousLogin, UserContext } from "./auth";

import AppWrapper from "./AppWrapper";

import Home from "./screens/Home";
import Host from "./screens/Host";
import Quiz from "./screens/Quiz";
import Login from "./screens/Login";
import Create from "./screens/Create";
import Profile from "./screens/Profile";

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
