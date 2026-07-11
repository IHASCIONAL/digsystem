import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/vehicles/[plate]", () => {
  test("With a plate that is not registered", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/vehicles/NOTFOUND1",
    );

    expect(response.status).toBe(404);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      name: "NotFoundError",
      message: "A placa informada não foi encontrada no sistema.",
      action: "Verifique se a placa está digitada corretamente.",
      status_code: 404,
    });
  });

  test("With a plate that is registered", async () => {
    const vehicle = await orchestrator.createVehicle({
      plate: "GET1234",
      owner_name: "João Lima",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/vehicles/${vehicle.plate}`,
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      id: vehicle.id,
      plate: vehicle.plate,
      owner_name: "João Lima",
      model: null,
      brand: null,
      color: null,
      notes: null,
      created_at: vehicle.created_at.toISOString(),
      updated_at: vehicle.updated_at.toISOString(),
    });
  });
});
