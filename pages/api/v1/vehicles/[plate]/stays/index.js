import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import vehicle from "models/vehicle.js";
import stay from "models/stay.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:stay"), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const { plate } = request.query;

  const vehicleFound = await vehicle.findOneByPlate(plate);
  const history = await stay.findAllByVehicleId(vehicleFound.id);

  return response.status(200).json(history);
}
