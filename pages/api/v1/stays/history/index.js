import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import stay from "models/stay.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:stay:all"), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const { start, end } = request.query;

  const stays = await stay.findAllInRange(start, end);

  return response.status(200).json(stays);
}
