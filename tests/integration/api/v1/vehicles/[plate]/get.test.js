import orchestrator from "tests/orchestrator.js";

let collaboratorSession;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();

  const collaborator = await orchestrator.createCollaborator({});
  collaboratorSession = await orchestrator.createSession(collaborator.id);
});

describe("GET /api/v1/vehicles/[plate]", () => {
  test("Anonymous user cannot fetch a vehicle", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/vehicles/NOTFOUND1",
    );

    expect(response.status).toBe(403);
  });

  test("With a plate that is not registered", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/vehicles/NOTFOUND1",
      { headers: { Cookie: `session_id=${collaboratorSession.token}` } },
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
      { headers: { Cookie: `session_id=${collaboratorSession.token}` } },
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
      created_by: null,
      created_at: vehicle.created_at.toISOString(),
      updated_at: vehicle.updated_at.toISOString(),
    });
  });
});
