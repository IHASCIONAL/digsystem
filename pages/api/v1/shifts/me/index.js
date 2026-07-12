import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import shift from "models/shift.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:shift"), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const userTryingToGet = request.context.user;
  const currentShift = await shift.findCurrentByUserId(userTryingToGet.id);

  return response.status(200).json({ shift: currentShift });
}
