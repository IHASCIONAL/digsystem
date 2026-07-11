import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import vehicle from "models/vehicle.js";

const router = createRouter();

router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const vehicleInputValues = request.body;
  const newVehicle = await vehicle.create(vehicleInputValues);

  return response.status(201).json(newVehicle);
}
