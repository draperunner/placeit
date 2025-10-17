import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

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
        <Routes>
          <Route path="/q/:id" element={<Quiz />} />
          <Route
            path="/host"
            element={
              <AppWrapper>
                <Host />
              </AppWrapper>
            }
          />
          <Route path="/create" element={<Create />} />
          <Route
            path="/login"
            element={
              <AppWrapper>
                <Login />
              </AppWrapper>
            }
          />
          <Route
            path="/profile"
            element={
              <AppWrapper>
                <Profile />
              </AppWrapper>
            }
          />
          <Route
            path="/"
            element={
              <AppWrapper backgroundColor="#0693e3">
                <Home />
              </AppWrapper>
            }
          />
        </Routes>
      </Router>
    </UserContext.Provider>
  );
}

export default App;
