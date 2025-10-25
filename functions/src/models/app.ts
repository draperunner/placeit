import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const app = initializeApp();

getFirestore(app).settings({ ignoreUndefinedProperties: true });
