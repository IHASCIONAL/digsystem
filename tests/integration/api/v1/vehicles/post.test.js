import orchestrator from "tests/orchestrator.js";
import { version as uuidVersion } from "uuid";
import vehicle from "models/vehicle.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/vehicles", () => {
  test("With unique and valid data", async () => {
    const response = await fetch("http://localhost:3000/api/v1/vehicles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plate: "abc1d23",
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
      model: "Onix",
      brand: "Chevrolet",
      color: "Prata",
      notes: "Retrovisor direito arranhado",
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
      model: null,
      brand: null,
      color: null,
      notes: null,
      created_at: responseBody.created_at,
      updated_at: responseBody.updated_at,
    });
  });

  test("With duplicated plate (case insensitive)", async () => {
    const response1 = await fetch("http://localhost:3000/api/v1/vehicles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
