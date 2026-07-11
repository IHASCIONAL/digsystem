import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import dashboard from "models/dashboard.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:dashboard"), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const summary = await dashboard.getSummary();

  return response.status(200).json(summary);
}
