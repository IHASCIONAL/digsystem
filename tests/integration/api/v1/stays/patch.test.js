import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/stays", () => {
  test("With a vehicle that is parked", async () => {
    const vehicle = await orchestrator.createVehicle();

    await fetch("http://localhost:3000/api/v1/stays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plate: vehicle.plate,
      }),
    });

    const response = await fetch("http://localhost:3000/api/v1/stays", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
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
      },
      body: JSON.stringify({
        plate: vehicle.plate,
      }),
    });

    const response1 = await fetch("http://localhost:3000/api/v1/stays", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
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
});
