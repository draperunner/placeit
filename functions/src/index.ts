import * as admin from "firebase-admin";

admin.initializeApp();

export { sessions } from "./sessions";
export { quizzes } from "./quizzes";
export { startQuiz } from "./startQuiz";
