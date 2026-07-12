import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import settings from "models/settings.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:settings"), getHandler);
router.patch(controller.canRequest("update:settings"), patchHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const currentSettings = await settings.get();

  return response.status(200).json(currentSettings);
}

async function patchHandler(request, response) {
  const { rate_per_12h_cents } = request.body;

  const updatedSettings =
    await settings.updateRatePer12hCents(rate_per_12h_cents);

  return response.status(200).json(updatedSettings);
}
