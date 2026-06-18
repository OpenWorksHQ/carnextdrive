import { getCheckoutStatus } from "../../server/routes/stripe";
import { createJsonFunction, withRouteParam } from "../../server/vercel";

export default createJsonFunction(
  "get",
  withRouteParam("sessionId", getCheckoutStatus),
);
