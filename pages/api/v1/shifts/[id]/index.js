import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import shift from "models/shift.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:shift:all"), getHandler);
router.patch(controller.canRequest("update:shift:admin"), patchHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const { id } = request.query;

  const foundShift = await shift.findOneById(id);

  return response.status(200).json(foundShift);
}

async function patchHandler(request, response) {
  const { id } = request.query;
  const userEditing = request.context.user;

  const updatedShift = await shift.adminUpdate(
    id,
    request.body,
    userEditing.id,
  );

  return response.status(200).json(updatedShift);
}
