import {
  getFirestore,
  QueryDocumentSnapshot,
  Timestamp,
  Transaction,
} from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/scheduler";
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import { db } from "./models/db.js";
import {
  QuizSessionAppType,
  QuizSessionDbType,
} from "./models/quizSessions.js";
import { QuizAppType, QuizDbType } from "./models/quizzes.js";
import { SessionStatAppType } from "./models/sessionStats.js";

const DELETE_ANONYMOUS_USERS_AFTER_DAYS = 7;
const DELETE_REGISTERED_USERS_AFTER_DAYS = 365;
const DELETE_QUIZ_SESSIONS_AFTER_HOURS = 6;

async function getQuizSession(
  id: string,
  transaction?: Transaction,
): Promise<QuizSessionAppType | null> {
  const ref = db.quizSessions.doc(id);
  const doc = transaction ? await transaction.get(ref) : await ref.get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() || null;
}

async function cleanSessions() {
  const firestore = getFirestore();
  logger.info("Starting cleanup of old quiz sessions");

  const query = db.quizSessions
    .where(
      "createdAt",
      "<=",
      Timestamp.fromDate(
        new Date(
          Date.now() - DELETE_QUIZ_SESSIONS_AFTER_HOURS * 60 * 60 * 1000,
        ),
      ),
    )
    .select();

  for await (const doc of query.stream()) {
    const sessionDoc = doc as unknown as QueryDocumentSnapshot<
      QuizSessionAppType,
      QuizSessionDbType
    >;
    const id = sessionDoc.id;

    logger.info(`Deleting quiz session with ID: ${id}`);

    try {
      await firestore.runTransaction(async (transaction) => {
        const session = await getQuizSession(id, transaction);

        if (!session) {
          throw new Error(`Session with ID ${id} does not exist.`);
        }

        const stats: SessionStatAppType = {
          quizId: session.quizDetails.id,
          numberOfParticipants: session.participants.length,
          numberOfQuestions: session.quizDetails.numberOfQuestions,
          language: session.quizDetails.language,
          startedAt: session.startedAt,
          finalState: session.state,
          map: session.map.id,
          answerTimeLimit: session.answerTimeLimit,
        };

        transaction.delete(db.quizSessions.doc(id));
        transaction.delete(db.quizStates.doc(id));
        transaction.set(db.sessionStats.doc(id), stats);
      });
    } catch (error) {
      logger.error(`Error deleting session with ID: ${id}`, error);
    }
  }
}

async function cleanUsers(pageToken?: string): Promise<string | undefined> {
  const auth = getAuth();
  const firestore = getFirestore();

  logger.info(
    `Starting cleanup of old users ${pageToken ? "with" : "without"} page token`,
  );

  const listUsersResult = await auth.listUsers(1000, pageToken);
  const uidsToDelete: string[] = [];

  for (const user of listUsersResult.users) {
    try {
      const isAnonymous = !user.email || user.providerData.length === 0;
      const { lastSignInTime, lastRefreshTime } = user.metadata;
      const lastActiveDate = new Date(lastRefreshTime ?? lastSignInTime);

      const anonymousThreshold =
        Date.now() - DELETE_ANONYMOUS_USERS_AFTER_DAYS * 24 * 60 * 60 * 1000;
      const registeredThreshold =
        Date.now() - DELETE_REGISTERED_USERS_AFTER_DAYS * 24 * 60 * 60 * 1000;

      if (
        (isAnonymous && lastActiveDate.getTime() >= anonymousThreshold) ||
        (!isAnonymous && lastActiveDate.getTime() >= registeredThreshold)
      ) {
        // Still active, skip deletion
        logger.debug(`Skipping deletion of user with UID: ${user.uid}`, {
          uid: user.uid,
          isAnonymous,
          emailVerified: user.emailVerified,
          lastSignInTime,
          lastRefreshTime,
          lastActiveDate: lastActiveDate.toISOString(),
        });
        continue;
      }

      logger.info(`Deleting user with UID: ${user.uid}`, {
        uid: user.uid,
        isAnonymous,
        emailVerified: user.emailVerified,
        lastSignInTime,
        lastRefreshTime,
        lastActiveDate: lastActiveDate.toISOString(),
      });

      if (isAnonymous) {
        uidsToDelete.push(user.uid);
        continue;
      }

      // Delete all quizzes created by this user, private and public
      const query = db.quizzes.where("author.uid", "==", user.uid).select();

      const bulkWriter = firestore.bulkWriter();

      for await (const doc of query.stream()) {
        const quizDoc = doc as unknown as QueryDocumentSnapshot<
          QuizAppType,
          QuizDbType
        >;
        const id = quizDoc.id;

        logger.info(`Deleting quiz with ID: ${id}`, {
          uid: user.uid,
          quizId: id,
        });

        void bulkWriter.delete(db.quizzes.doc(id));
      }

      await bulkWriter.close();
      uidsToDelete.push(user.uid);
    } catch (error) {
      logger.error(`Error processing user with uid: ${user.uid}`, error);
    }
  }

  // Bulk delete users
  logger.info(`Deleting ${uidsToDelete.length} users from Authentication`);
  await auth.deleteUsers(uidsToDelete);

  // Ensure we respect the rate limit of 1 bulk delete query per second.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return listUsersResult.pageToken;
}

export const cleanup = onSchedule(
  {
    schedule: "every 24 hours",
    region: "europe-west1",
  },
  async () => {
    logger.info("Cleanup function executed");

    await cleanSessions();

    let pageToken = await cleanUsers();

    while (pageToken) {
      pageToken = await cleanUsers(pageToken);
    }

    logger.info("Cleanup function completed");
  },
);
