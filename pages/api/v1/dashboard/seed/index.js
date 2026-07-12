import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import dashboard from "models/dashboard.js";
import { NotFoundError } from "infra/errors.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("read:dashboard"), postHandler);
router.delete(controller.canRequest("read:dashboard"), deleteHandler);

export default router.handler(controller.errorHandlers);

function guardDevelopmentOnly() {
  if (process.env.NODE_ENV !== "development") {
    throw new NotFoundError({
      message: "Rota não encontrada.",
      action: "Verifique se o endereço está correto.",
    });
  }
}

async function postHandler(request, response) {
  guardDevelopmentOnly();

  const userTryingToSeed = request.context.user;
  await dashboard.seedDevelopmentData(userTryingToSeed.id);

  return response
    .status(201)
    .json({ message: "Dados de teste gerados com sucesso." });
}

async function deleteHandler(request, response) {
  guardDevelopmentOnly();

  await dashboard.resetDevelopmentData();

  return response
    .status(200)
    .json({ message: "Dados de teste removidos com sucesso." });
}
