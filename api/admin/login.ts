import { adminLogin } from "../../server/routes/admin";
import { createJsonFunction } from "../../server/vercel";

export default createJsonFunction("post", adminLogin);
