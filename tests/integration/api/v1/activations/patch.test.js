import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/activations", () => {
  test("Template test to not fail and fill up later", async () => {
    const response = await fetch("http://localhost:3000/api/v1/activations", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(404);
  });
});
