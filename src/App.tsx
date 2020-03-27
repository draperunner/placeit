import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import "firebase";
import "firebase/firestore";

import { useAnonymousLogin, UserContext } from "./auth";

import Home from "./screens/Home";
import Host from "./screens/Host";
import Quiz from "./screens/Quiz";

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
              <Host />
            </Route>
            <Route path="/">
              <Home />
            </Route>
          </Switch>
        </div>
      </Router>
    </UserContext.Provider>
  );
}

export default App;
