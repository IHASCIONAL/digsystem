import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import stay from "models/stay.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:stay:all"), getHandler);
router.patch(controller.canRequest("update:stay:admin"), patchHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const { id } = request.query;

  const foundStay = await stay.findOneById(id);

  return response.status(200).json(foundStay);
}

async function patchHandler(request, response) {
  const { id } = request.query;
  const userEditing = request.context.user;

  const updatedStay = await stay.adminUpdate(id, request.body, userEditing.id);

  return response.status(200).json(updatedStay);
}
