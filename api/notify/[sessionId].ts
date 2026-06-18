import { notifyHandler } from "../../server/routes/notifications";
import { createJsonFunction, withRouteParam } from "../../server/vercel";

export default createJsonFunction(
  "post",
  withRouteParam("sessionId", notifyHandler),
);
