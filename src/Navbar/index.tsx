import { Link } from "react-router-dom";

import { useUser } from "../auth";

import styles from "./Navbar.module.css";

export default function Navbar() {
  const user = useUser();
  return (
    <nav className={styles.navbar}>
      {window.location.pathname !== "/" ? (
        <Link to="/">Place it!</Link>
      ) : (
        <div />
      )}
      {user && !user.isAnonymous ? (
        <Link to="/profile">
          <img
            className={styles.navbarProfileImg}
            src={user.photoURL || `https://joesch.moe/api/v1/${user.uid}`}
            alt={user.displayName || "profile photo"}
          />
        </Link>
      ) : (
        <Link to="/login">Log in</Link>
      )}
    </nav>
  );
}
