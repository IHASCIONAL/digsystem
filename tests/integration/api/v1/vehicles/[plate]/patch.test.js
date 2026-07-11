import orchestrator from "tests/orchestrator.js";

let collaboratorSession;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();

  const collaborator = await orchestrator.createCollaborator({});
  collaboratorSession = await orchestrator.createSession(collaborator.id);
});

describe("PATCH /api/v1/vehicles/[plate]", () => {
  test("Anonymous user cannot edit a vehicle", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/vehicles/NOTFOUND1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_name: "Alguém" }),
      },
    );

    expect(response.status).toBe(403);
  });

  test("With a plate that is not registered", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/vehicles/NOTFOUND1",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${collaboratorSession.token}`,
        },
        body: JSON.stringify({ owner_name: "Alguém" }),
      },
    );

    expect(response.status).toBe(404);
  });

  test("Updating only one field keeps the others untouched", async () => {
    const vehicle = await orchestrator.createVehicle({
      plate: "PCH1234",
      owner_name: "Carlos Nunes",
      model: "Gol",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/vehicles/${vehicle.plate}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${collaboratorSession.token}`,
        },
        body: JSON.stringify({ color: "Preto" }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      id: vehicle.id,
      plate: "PCH1234",
      owner_name: "Carlos Nunes",
      model: "Gol",
      brand: null,
      color: "Preto",
      notes: null,
      created_by: null,
      created_at: vehicle.created_at.toISOString(),
      updated_at: responseBody.updated_at,
    });

    expect(Date.parse(responseBody.updated_at)).toBeGreaterThan(
      vehicle.updated_at.getTime() - 1,
    );
  });

  test("Updating the plate to a new valid and unique value", async () => {
    const vehicle = await orchestrator.createVehicle({ plate: "OLD1234" });

    const response = await fetch(
      `http://localhost:3000/api/v1/vehicles/${vehicle.plate}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${collaboratorSession.token}`,
        },
        body: JSON.stringify({ plate: "new5d67" }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.plate).toBe("NEW5D67");

    const notFoundResponse = await fetch(
      "http://localhost:3000/api/v1/vehicles/OLD1234",
      { headers: { Cookie: `session_id=${collaboratorSession.token}` } },
    );
    expect(notFoundResponse.status).toBe(404);
  });

  test("Updating the plate to one that already belongs to another vehicle", async () => {
    await orchestrator.createVehicle({ plate: "TKN1111" });
    const vehicle2 = await orchestrator.createVehicle({ plate: "TKN2222" });

    const response = await fetch(
      `http://localhost:3000/api/v1/vehicles/${vehicle2.plate}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${collaboratorSession.token}`,
        },
        body: JSON.stringify({ plate: "TKN1111" }),
      },
    );

    expect(response.status).toBe(400);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      name: "ValidationError",
      message: "A placa informada já está cadastrada.",
      action:
        "Verifique se a placa está correta ou consulte o veículo já existente.",
      status_code: 400,
    });
  });

  test("Updating the plate to an invalid format", async () => {
    const vehicle = await orchestrator.createVehicle({ plate: "FMT1234" });

    const response = await fetch(
      `http://localhost:3000/api/v1/vehicles/${vehicle.plate}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${collaboratorSession.token}`,
        },
        body: JSON.stringify({ plate: "AB1" }),
      },
    );

    expect(response.status).toBe(400);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      name: "ValidationError",
      message: "A placa informada não é válida.",
      action:
        "Informe uma placa no formato antigo (ABC1234) ou Mercosul (ABC1D23).",
      status_code: 400,
    });
  });
});
