import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import vehicle from "models/vehicle.js";
import authorization from "models/authorization.js";
import { ForbiddenError } from "infra/errors";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:vehicle"), getHandler);
router.patch(
  controller.canRequest("update:vehicle"),
  controller.requireOpenShift(),
  patchHandler,
);
router.delete(
  controller.canRequest("delete:vehicle"),
  controller.requireOpenShift(),
  deleteHandler,
);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const { plate } = request.query;
  const vehicleFound = await vehicle.findOneByPlate(plate);

  return response.status(200).json(vehicleFound);
}

async function patchHandler(request, response) {
  const { plate } = request.query;
  const vehicleInputValues = request.body;

  const updatedVehicle = await vehicle.update(plate, vehicleInputValues);

  return response.status(200).json(updatedVehicle);
}

async function deleteHandler(request, response) {
  const { plate } = request.query;
  const userTryingToDelete = request.context.user;

  const vehicleToDelete = await vehicle.findOneByPlate(plate);

  if (
    !authorization.can(userTryingToDelete, "delete:vehicle", vehicleToDelete)
  ) {
    throw new ForbiddenError({
      message: "Você não possui permissão para excluir este veículo.",
      action:
        "Apenas quem cadastrou o veículo há menos de 1 hora, ou um administrador, pode excluí-lo.",
    });
  }

  await vehicle.remove(plate);

  return response
    .status(200)
    .json({ message: "Veículo excluído com sucesso." });
}
