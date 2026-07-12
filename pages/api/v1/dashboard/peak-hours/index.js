import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import dashboard from "models/dashboard.js";
import { ValidationError } from "infra/errors.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:dashboard"), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const { date } = request.query;

  if (!date) {
    throw new ValidationError({
      message: "É necessário informar uma data.",
      action: "Informe a data no formato AAAA-MM-DD.",
    });
  }

  const peakHours = await dashboard.getPeakHours(date);

  return response.status(200).json({ date, peak_hours: peakHours });
}
