import * as admin from "firebase-admin";

admin.initializeApp();

export { sessions } from "./sessions";
export { quizzes } from "./quizzes";
export { onSessionChange } from "./onSessionChange";
export { onStateChange } from "./onStateChange";
