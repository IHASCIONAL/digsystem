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

describe("DELETE /api/v1/vehicles/[plate]", () => {
  test("Anonymous user cannot delete a vehicle", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/vehicles/NOTFOUND1",
      { method: "DELETE" },
    );

    expect(response.status).toBe(403);
  });

  test("Collaborator without an open shift cannot delete a vehicle", async () => {
    const collaboratorWithoutShift = await orchestrator.createCollaborator({});
    const sessionWithoutShift = await orchestrator.createSession(
      collaboratorWithoutShift.id,
    );
    const vehicle = await orchestrator.createVehicle({
      createdBy: collaboratorWithoutShift.id,
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/vehicles/${vehicle.plate}`,
      {
        method: "DELETE",
        headers: { Cookie: `session_id=${sessionWithoutShift.token}` },
      },
    );

    expect(response.status).toBe(403);
  });

  test("Collaborator deletes a vehicle they registered themselves within the window", async () => {
    const vehicle = await orchestrator.createVehicle({
      createdBy: collaborator.id,
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/vehicles/${vehicle.plate}`,
      {
        method: "DELETE",
        headers: { Cookie: `session_id=${collaboratorSession.token}` },
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toEqual({
      message: "Veículo excluído com sucesso.",
    });

    const getResponse = await fetch(
      `http://localhost:3000/api/v1/vehicles/${vehicle.plate}`,
      { headers: { Cookie: `session_id=${collaboratorSession.token}` } },
    );
    expect(getResponse.status).toBe(404);
  });

  test("Collaborator cannot delete a vehicle registered by someone else", async () => {
    const otherCollaborator = await orchestrator.createCollaborator({});
    const vehicle = await orchestrator.createVehicle({
      createdBy: otherCollaborator.id,
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/vehicles/${vehicle.plate}`,
      {
        method: "DELETE",
        headers: { Cookie: `session_id=${collaboratorSession.token}` },
      },
    );

    expect(response.status).toBe(403);

    const responseBody = await response.json();
    expect(responseBody).toEqual({
      name: "ForbiddenError",
      message: "Você não possui permissão para excluir este veículo.",
      action:
        "Apenas quem cadastrou o veículo há menos de 1 hora, ou um administrador, pode excluí-lo.",
      status_code: 403,
    });
  });

  test("Collaborator cannot delete their own vehicle after the 1h window", async () => {
    const vehicle = await orchestrator.createVehicle({
      createdBy: collaborator.id,
    });
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    await orchestrator.backdateVehicleCreation(vehicle.id, twoHoursAgo);

    const response = await fetch(
      `http://localhost:3000/api/v1/vehicles/${vehicle.plate}`,
      {
        method: "DELETE",
        headers: { Cookie: `session_id=${collaboratorSession.token}` },
      },
    );

    expect(response.status).toBe(403);
  });

  test("Admin deletes any vehicle regardless of who registered it or when", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const vehicle = await orchestrator.createVehicle({
      createdBy: collaborator.id,
    });
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    await orchestrator.backdateVehicleCreation(vehicle.id, twoHoursAgo);

    const response = await fetch(
      `http://localhost:3000/api/v1/vehicles/${vehicle.plate}`,
      {
        method: "DELETE",
        headers: { Cookie: `session_id=${adminSession.token}` },
      },
    );

    expect(response.status).toBe(200);
  });

  test("Cannot delete a vehicle with registered stays", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const vehicle = await orchestrator.createVehicle();
    await orchestrator.createStayAt(vehicle.id, collaborator.id, {
      entryTime: new Date().toISOString(),
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/vehicles/${vehicle.plate}`,
      {
        method: "DELETE",
        headers: { Cookie: `session_id=${adminSession.token}` },
      },
    );

    expect(response.status).toBe(400);

    const responseBody = await response.json();
    expect(responseBody).toEqual({
      name: "ValidationError",
      message:
        "Não é possível excluir um veículo com permanências registradas.",
      action:
        "Veículos com histórico de entradas e saídas não podem ser removidos do cadastro.",
      status_code: 400,
    });
  });

  test("Returns 404 for a nonexistent plate", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const response = await fetch(
      "http://localhost:3000/api/v1/vehicles/NOTFOUND1",
      {
        method: "DELETE",
        headers: { Cookie: `session_id=${adminSession.token}` },
      },
    );

    expect(response.status).toBe(404);
  });
});
