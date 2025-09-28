export const SESSIONS_URL = import.meta.env.DEV
  ? "http://localhost:5001/mapquiz-app/europe-west1/sessions2ndGen"
  : "https://europe-west1-mapquiz-app.cloudfunctions.net/sessions2ndGen";

export const QUIZZES_URL = import.meta.env.DEV
  ? "http://localhost:5001/mapquiz-app/europe-west1/quizzes2ndGen"
  : "https://europe-west1-mapquiz-app.cloudfunctions.net/quizzes2ndGen";
