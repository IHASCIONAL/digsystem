import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/vehicles", () => {
  test("With no vehicles registered", async () => {
    const response = await fetch("http://localhost:3000/api/v1/vehicles");

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual([]);
  });

  test("With vehicles registered", async () => {
    const vehicle1 = await orchestrator.createVehicle({ plate: "LST1111" });
    const vehicle2 = await orchestrator.createVehicle({ plate: "LST2222" });

    const response = await fetch("http://localhost:3000/api/v1/vehicles");

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual([
      expect.objectContaining({ id: vehicle1.id, plate: "LST1111" }),
      expect.objectContaining({ id: vehicle2.id, plate: "LST2222" }),
    ]);
  });
});
