import orchestrator from "tests/orchestrator.js";

let collaborator;
let collaboratorSession;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();

  collaborator = await orchestrator.createCollaborator({});
  collaboratorSession = await orchestrator.createSession(collaborator.id);
  await orchestrator.createShiftAt(collaborator.id, {
    checkInTime: new Date().toISOString(),
  });
});

async function checkIn(plate) {
  await fetch("http://localhost:3000/api/v1/stays", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${collaboratorSession.token}`,
    },
    body: JSON.stringify({ plate }),
  });
}

async function checkOut(plate) {
  await fetch("http://localhost:3000/api/v1/stays", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${collaboratorSession.token}`,
    },
    body: JSON.stringify({ plate }),
  });
}

describe("GET /api/v1/vehicles/[plate]/stays", () => {
  test("Anonymous user cannot fetch a vehicle's stay history", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/vehicles/NOTFOUND1/stays",
    );

    expect(response.status).toBe(403);
  });

  test("With a plate that is not registered", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/vehicles/NOTFOUND1/stays",
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

  test("With a vehicle that never parked", async () => {
    const vehicle = await orchestrator.createVehicle();

    const response = await fetch(
      `http://localhost:3000/api/v1/vehicles/${vehicle.plate}/stays`,
      { headers: { Cookie: `session_id=${collaboratorSession.token}` } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual([]);
  });

  test("With a vehicle that has one finished and one open stay", async () => {
    const vehicle = await orchestrator.createVehicle();

    await checkIn(vehicle.plate);
    await checkOut(vehicle.plate);
    await checkIn(vehicle.plate);

    const response = await fetch(
      `http://localhost:3000/api/v1/vehicles/${vehicle.plate}/stays`,
      { headers: { Cookie: `session_id=${collaboratorSession.token}` } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toHaveLength(2);

    expect(responseBody[0]).toEqual({
      id: responseBody[0].id,
      vehicle_id: vehicle.id,
      entry_time: responseBody[0].entry_time,
      exit_time: null,
      checked_in_by: collaborator.id,
      checked_out_by: null,
      rate_cents: 2500,
      price_cents: null,
      edited_by: null,
      edited_at: null,
      created_at: responseBody[0].created_at,
      updated_at: responseBody[0].updated_at,
      duration_in_seconds: null,
    });

    expect(responseBody[1]).toEqual({
      id: responseBody[1].id,
      vehicle_id: vehicle.id,
      entry_time: responseBody[1].entry_time,
      exit_time: responseBody[1].exit_time,
      checked_in_by: collaborator.id,
      checked_out_by: collaborator.id,
      rate_cents: 2500,
      price_cents: 2500,
      edited_by: null,
      edited_at: null,
      created_at: responseBody[1].created_at,
      updated_at: responseBody[1].updated_at,
      duration_in_seconds: responseBody[1].duration_in_seconds,
    });

    expect(responseBody[1].exit_time).not.toBeNull();
    expect(responseBody[1].duration_in_seconds).toBeGreaterThanOrEqual(0);

    expect(Date.parse(responseBody[0].entry_time)).toBeGreaterThan(
      Date.parse(responseBody[1].entry_time),
    );
  });
});
