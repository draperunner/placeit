import cors from "cors";

const WHITELIST = [
  "https://placeit.no",
  "https://www.placeit.no",
  "https://mapquiz-app.web.app",
];

const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (origin && WHITELIST.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed by CORS"));
  },
});

export default corsMiddleware;
