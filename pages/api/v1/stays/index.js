import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import vehicle from "models/vehicle.js";
import stay from "models/stay.js";

const router = createRouter();

router.get(getHandler);
router.post(postHandler);
router.patch(patchHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const parkedVehicles = await stay.findAllParked();

  return response.status(200).json(parkedVehicles);
}

async function postHandler(request, response) {
  const { plate } = request.body;

  const vehicleFound = await vehicle.findOneByPlate(plate);
  const newStay = await stay.create(vehicleFound.id);

  return response.status(201).json(newStay);
}

async function patchHandler(request, response) {
  const { plate } = request.body;

  const vehicleFound = await vehicle.findOneByPlate(plate);
  const closedStay = await stay.close(vehicleFound.id);

  return response.status(200).json(closedStay);
}
