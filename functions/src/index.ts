import * as admin from "firebase-admin";

admin.initializeApp();

export { sessions2ndGen } from "./sessions";
export { quizzes2ndGen } from "./quizzes";
export { onSessionChange2ndGen } from "./onSessionChange";
export { onStateChange2ndGen } from "./onStateChange";
