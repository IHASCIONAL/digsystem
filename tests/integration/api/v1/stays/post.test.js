import orchestrator from "tests/orchestrator.js";
import { version as uuidVersion } from "uuid";

let collaboratorSession;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();

  const collaborator = await orchestrator.createCollaborator({});
  collaboratorSession = await orchestrator.createSession(collaborator.id);
});

describe("POST /api/v1/stays", () => {
  test("Anonymous user cannot register a check-in", async () => {
    const vehicle = await orchestrator.createVehicle();

    const response = await fetch("http://localhost:3000/api/v1/stays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plate: vehicle.plate }),
    });

    expect(response.status).toBe(403);
  });

  test("With a registered and available vehicle", async () => {
    const vehicle = await orchestrator.createVehicle();

    const response = await fetch("http://localhost:3000/api/v1/stays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({
        plate: vehicle.plate,
      }),
    });

    expect(response.status).toBe(201);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      id: responseBody.id,
      vehicle_id: vehicle.id,
      entry_time: responseBody.entry_time,
      exit_time: null,
      created_at: responseBody.created_at,
      updated_at: responseBody.updated_at,
    });

    expect(uuidVersion(responseBody.id)).toBe(4);
    expect(Date.parse(responseBody.entry_time)).not.toBeNaN();
  });

  test("With a plate that is not registered", async () => {
    const response = await fetch("http://localhost:3000/api/v1/stays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({
        plate: "NOTFOUND1",
      }),
    });

    expect(response.status).toBe(404);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      name: "NotFoundError",
      message: "A placa informada não foi encontrada no sistema.",
      action: "Verifique se a placa está digitada corretamente.",
      status_code: 404,
    });
  });

  test("With a vehicle that is already parked", async () => {
    const vehicle = await orchestrator.createVehicle();

    const response1 = await fetch("http://localhost:3000/api/v1/stays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({
        plate: vehicle.plate,
      }),
    });

    expect(response1.status).toBe(201);

    const response2 = await fetch("http://localhost:3000/api/v1/stays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({
        plate: vehicle.plate,
      }),
    });

    expect(response2.status).toBe(400);

    const response2Body = await response2.json();

    expect(response2Body).toEqual({
      name: "ValidationError",
      message: "O veículo já está estacionado.",
      action: "Registre a saída antes de uma nova entrada.",
      status_code: 400,
    });
  });
});
