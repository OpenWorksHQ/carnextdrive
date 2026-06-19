// Standalone Express dev server for use behind the kubernetes ingress
// that maps /api/* to port 8001. The main Vite dev server (port 3000)
// also serves /api/* via the same createServer() middleware for direct
// local testing.
import { createServer } from "./index.js";

const port = Number(process.env.API_PORT || 8001);
const app = createServer();
app.listen(port, "0.0.0.0", () => {
  console.log(`[api] listening on 0.0.0.0:${port}`);
});
