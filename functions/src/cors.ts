import cors from "cors";

const WHITELIST = new Set([
  "https://placeit.no",
  "https://www.placeit.no",
  "https://mapquiz-app.web.app",
]);

const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (
      process.env.FUNCTIONS_EMULATOR === "true" ||
      (origin && WHITELIST.has(origin))
    ) {
      callback(null, true);
    } else {
      callback(new Error("Origin not allowed by CORS"));
    }
  },
});

export default corsMiddleware;
