import { Request, Response, NextFunction } from "express";

import { getAuth, UserRecord } from "firebase-admin/auth";
import { AsyncLocalStorage } from "node:async_hooks";

interface VerifyOptions {
  forbidAnonymous?: boolean;
}

const userContext = new AsyncLocalStorage<UserRecord>();

export const getUserContext = (): UserRecord => {
  const context = userContext.getStore();
  if (!context) {
    throw new Error("Auth context not found");
  }
  return context;
};

export function verifyToken(options?: VerifyOptions) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const auth = getAuth();
      const token = (req.get("Authorization") || "").replace("Bearer ", "");
      const decodedToken = await auth.verifyIdToken(token);

      const userRecord = await auth.getUser(decodedToken.uid);

      if (options?.forbidAnonymous && !userRecord.email) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      userContext.run(userRecord, () => {
        next();
      });
    } catch {
      res.status(401).json({ message: "Unauthorized" });
    }
  };
}
