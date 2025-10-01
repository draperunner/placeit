import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    assetsInlineLimit: 0,
  },
  server: {
    port: 5423,
    headers: {
      "Content-Security-Policy":
        "default-src 'none'; connect-src 'self' http://127.0.0.1:9099 http://127.0.0.1:8080 http://localhost:5001 https://securetoken.googleapis.com https://firestore.googleapis.com https://europe-west1-mapquiz-app.cloudfunctions.net https://tiles.openfreemap.org; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://tiles.openfreemap.org https://*.tile.osm.org https://joesch.moe; style-src 'self' 'unsafe-inline'; font-src 'self'; manifest-src 'self'; worker-src 'self' blob:; object-src 'none'; child-src blob:; frame-ancestors 'none'; form-action 'none'; base-uri 'none';",
    },
  },
});
