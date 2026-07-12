import orchestrator from "tests/orchestrator.js";
import { version as uuidVersion } from "uuid";
import vehicle from "models/vehicle.js";

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

describe("POST /api/v1/vehicles", () => {
  describe("Anonymous user", () => {
    test("Cannot register a vehicle", async () => {
      const response = await fetch("http://localhost:3000/api/v1/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plate: "ANN1234" }),
      });

      expect(response.status).toBe(403);
    });
  });

  test("Collaborator without an open shift cannot register a vehicle", async () => {
    const collaboratorWithoutShift = await orchestrator.createCollaborator({});
    const sessionWithoutShift = await orchestrator.createSession(
      collaboratorWithoutShift.id,
    );

    const response = await fetch("http://localhost:3000/api/v1/vehicles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionWithoutShift.token}`,
      },
      body: JSON.stringify({ plate: "NSH1234" }),
    });

    expect(response.status).toBe(403);

    const responseBody = await response.json();
    expect(responseBody).toEqual({
      name: "ForbiddenError",
      message:
        "Você precisa fazer check-in do seu expediente antes de operar veículos.",
      action: "Faça o check-in na página inicial antes de continuar.",
      status_code: 403,
    });
  });

  describe("Collaborator user", () => {
    test("With unique and valid data", async () => {
      const response = await fetch("http://localhost:3000/api/v1/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${collaboratorSession.token}`,
        },
        body: JSON.stringify({
          plate: "abc1d23",
          owner_name: "Maria Souza",
          model: "Onix",
          brand: "Chevrolet",
          color: "Prata",
          notes: "Retrovisor direito arranhado",
        }),
      });

      expect(response.status).toBe(201);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        plate: "ABC1D23",
        owner_name: "Maria Souza",
        model: "Onix",
        brand: "Chevrolet",
        color: "Prata",
        notes: "Retrovisor direito arranhado",
        created_by: collaborator.id,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      const vehicleInDatabase = await vehicle.findOneByPlate("ABC1D23");
      expect(vehicleInDatabase.id).toBe(responseBody.id);
    });

    test("With only the required field (plate)", async () => {
      const response = await fetch("http://localhost:3000/api/v1/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${collaboratorSession.token}`,
        },
        body: JSON.stringify({
          plate: "xyz9876",
        }),
      });

      expect(response.status).toBe(201);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        plate: "XYZ9876",
        owner_name: null,
        model: null,
        brand: null,
        color: null,
        notes: null,
        created_by: collaborator.id,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
    });

    test("With an invalid plate format", async () => {
      const response = await fetch("http://localhost:3000/api/v1/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${collaboratorSession.token}`,
        },
        body: JSON.stringify({
          plate: "AB123",
        }),
      });

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

    test("With duplicated plate (case insensitive)", async () => {
      const response1 = await fetch("http://localhost:3000/api/v1/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${collaboratorSession.token}`,
        },
        body: JSON.stringify({
          plate: "DUP1234",
        }),
      });

      expect(response1.status).toBe(201);

      const response2 = await fetch("http://localhost:3000/api/v1/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${collaboratorSession.token}`,
        },
        body: JSON.stringify({
          plate: "dup1234",
        }),
      });

      expect(response2.status).toBe(400);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        name: "ValidationError",
        message: "A placa informada já está cadastrada.",
        action:
          "Verifique se a placa está correta ou consulte o veículo já existente.",
        status_code: 400,
      });
    });
  });
});
