import { getCarPricing } from "../server/routes/stripe";
import { createJsonFunction } from "../server/vercel";

export default createJsonFunction("get", getCarPricing);
