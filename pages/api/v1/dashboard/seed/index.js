import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import dashboard from "models/dashboard.js";
import { NotFoundError } from "infra/errors.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("read:dashboard"), postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  if (process.env.NODE_ENV !== "development") {
    throw new NotFoundError({
      message: "Rota não encontrada.",
      action: "Verifique se o endereço está correto.",
    });
  }

  const userTryingToSeed = request.context.user;
  await dashboard.seedDevelopmentData(userTryingToSeed.id);

  return response
    .status(201)
    .json({ message: "Dados de teste gerados com sucesso." });
}
