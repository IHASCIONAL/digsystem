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

describe("PATCH /api/v1/stays", () => {
  test("Anonymous user cannot register a check-out", async () => {
    const response = await fetch("http://localhost:3000/api/v1/stays", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plate: "NOTFOUND1" }),
    });

    expect(response.status).toBe(403);
  });

  test("With a vehicle that is parked", async () => {
    const vehicle = await orchestrator.createVehicle();

    await fetch("http://localhost:3000/api/v1/stays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({
        plate: vehicle.plate,
      }),
    });

    const response = await fetch("http://localhost:3000/api/v1/stays", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({
        plate: vehicle.plate,
      }),
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      id: responseBody.id,
      vehicle_id: vehicle.id,
      entry_time: responseBody.entry_time,
      exit_time: responseBody.exit_time,
      checked_in_by: collaborator.id,
      checked_out_by: collaborator.id,
      rate_cents: 2500,
      price_cents: 2500,
      edited_by: null,
      edited_at: null,
      created_at: responseBody.created_at,
      updated_at: responseBody.updated_at,
      duration_in_seconds: responseBody.duration_in_seconds,
    });

    expect(Date.parse(responseBody.exit_time)).not.toBeNaN();
    expect(responseBody.duration_in_seconds).toBeGreaterThanOrEqual(0);

    const elapsedMilliseconds =
      Date.parse(responseBody.exit_time) - Date.parse(responseBody.entry_time);
    expect(responseBody.duration_in_seconds).toBe(
      Math.round(elapsedMilliseconds / 1000),
    );
  });

  test("With a plate that is not registered", async () => {
    const response = await fetch("http://localhost:3000/api/v1/stays", {
      method: "PATCH",
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

  test("With a vehicle that is registered but not parked", async () => {
    const vehicle = await orchestrator.createVehicle();

    const response = await fetch("http://localhost:3000/api/v1/stays", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({
        plate: vehicle.plate,
      }),
    });

    expect(response.status).toBe(404);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      name: "NotFoundError",
      message: "O veículo não possui uma permanência em aberto.",
      action:
        "Verifique se o veículo está estacionado antes de registrar a saída.",
      status_code: 404,
    });
  });

  test("With a vehicle that already left", async () => {
    const vehicle = await orchestrator.createVehicle();

    await fetch("http://localhost:3000/api/v1/stays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({
        plate: vehicle.plate,
      }),
    });

    const response1 = await fetch("http://localhost:3000/api/v1/stays", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({
        plate: vehicle.plate,
      }),
    });

    expect(response1.status).toBe(200);

    const response2 = await fetch("http://localhost:3000/api/v1/stays", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({
        plate: vehicle.plate,
      }),
    });

    expect(response2.status).toBe(404);

    const response2Body = await response2.json();

    expect(response2Body).toEqual({
      name: "NotFoundError",
      message: "O veículo não possui uma permanência em aberto.",
      action:
        "Verifique se o veículo está estacionado antes de registrar a saída.",
      status_code: 404,
    });
  });

  test("Price is rounded up to the next 12h block", async () => {
    const vehicle = await orchestrator.createVehicle();

    const thirteenHoursAgo = new Date(
      Date.now() - 13 * 60 * 60 * 1000,
    ).toISOString();
    await orchestrator.createStayAt(vehicle.id, collaborator.id, {
      entryTime: thirteenHoursAgo,
    });

    const response = await fetch("http://localhost:3000/api/v1/stays", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({ plate: vehicle.plate }),
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.rate_cents).toBe(2500);
    expect(responseBody.price_cents).toBe(5000);
  });
});
