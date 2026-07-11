import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import vehicle from "models/vehicle.js";

const router = createRouter();

router.get(getHandler);
router.patch(patchHandler);

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
