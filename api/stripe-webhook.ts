import { stripeWebhook } from "../server/routes/stripe";
import { createRawFunction } from "../server/vercel";

export default createRawFunction(stripeWebhook);
