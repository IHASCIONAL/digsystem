import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import shift from "models/shift.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:shift:all"), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const shifts = await shift.findAll();

  return response.status(200).json(shifts);
}
