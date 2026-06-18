import { createCheckoutSession } from "../server/routes/stripe";
import { createJsonFunction } from "../server/vercel";

export default createJsonFunction("post", createCheckoutSession);
