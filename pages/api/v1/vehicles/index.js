import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import vehicle from "models/vehicle.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:vehicle"), getHandler);
router.post(controller.canRequest("create:vehicle"), postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const vehicles = await vehicle.findAll();

  return response.status(200).json(vehicles);
}

async function postHandler(request, response) {
  const userTryingToCreate = request.context.user;
  const vehicleInputValues = request.body;
  const newVehicle = await vehicle.create(
    vehicleInputValues,
    userTryingToCreate.id,
  );

  return response.status(201).json(newVehicle);
}
