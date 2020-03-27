import { Request, Response, NextFunction } from "express";

import * as admin from "firebase-admin";

export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = (req.get("Authorization") || "").replace("Bearer ", "");
    const decodedToken = await admin.auth().verifyIdToken(token);
    // @ts-ignore
    req.user = { uid: decodedToken.uid };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
