import { Request, Response, NextFunction } from "express";

import * as admin from "firebase-admin";

interface VerifyOptions {
  forbidAnonymous?: boolean;
}

export function verifyToken(options?: VerifyOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = (req.get("Authorization") || "").replace("Bearer ", "");
      const decodedToken = await admin.auth().verifyIdToken(token);

      const userRecord = await admin.auth().getUser(decodedToken.uid);

      if (options?.forbidAnonymous && !userRecord.email) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // @ts-ignore
      req.user = userRecord.toJSON();

      return next();
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  };
}
