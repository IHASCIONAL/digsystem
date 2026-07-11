import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import shift from "models/shift.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:shift"), postHandler);
router.patch(controller.canRequest("update:shift"), patchHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const userTryingToCheckIn = request.context.user;
  const newShift = await shift.checkIn(userTryingToCheckIn.id);

  return response.status(201).json(newShift);
}

async function patchHandler(request, response) {
  const userTryingToCheckOut = request.context.user;
  const closedShift = await shift.checkOut(userTryingToCheckOut.id);

  return response.status(200).json(closedShift);
}
