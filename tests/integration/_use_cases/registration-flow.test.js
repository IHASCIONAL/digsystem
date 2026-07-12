import orchestrator from "tests/orchestrator.js";
import authorization from "models/authorization.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Use case: Admin creates a collaborator, collaborator logs in", () => {
  let adminSession;
  let createUserResponseBody;

  test("Admin logs in", async () => {
    const admin = await orchestrator.createAdmin({});
    adminSession = await orchestrator.createSession(admin.id);

    expect(adminSession.user_id).toBe(admin.id);
  });

  test("Admin creates a collaborator account", async () => {
    const createUserResponse = await fetch(
      "http://localhost:3000/api/v1/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          username: "RegistrationFlow",
          full_name: "Fluxo De Cadastro",
          phone: "11999998888",
          password: "RegistrationFlowPassword",
          features: authorization.collaboratorFeatures,
        }),
      },
    );
    expect(createUserResponse.status).toBe(201);

    createUserResponseBody = await createUserResponse.json();

    expect(createUserResponseBody).toEqual({
      id: createUserResponseBody.id,
      username: "RegistrationFlow",
      features: authorization.collaboratorFeatures,
      full_name: "Fluxo De Cadastro",
      cpf: null,
      phone: "11999998888",
      created_at: createUserResponseBody.created_at,
      updated_at: createUserResponseBody.updated_at,
    });
  });

  test("Collaborator logs in", async () => {
    const createSessionResponse = await fetch(
      "http://localhost:3000/api/v1/sessions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "RegistrationFlow",
          password: "RegistrationFlowPassword",
        }),
      },
    );

    expect(createSessionResponse.status).toBe(201);

    const createSessionResponseBody = await createSessionResponse.json();
    expect(createSessionResponseBody.user_id).toBe(createUserResponseBody.id);

    const userResponse = await fetch("http://localhost:3000/api/v1/user", {
      headers: {
        cookie: `session_id=${createSessionResponseBody.token}`,
      },
    });

    expect(userResponse.status).toBe(200);

    const userResponseBody = await userResponse.json();
    expect(userResponseBody.id).toBe(createUserResponseBody.id);
    expect(userResponseBody.username).toBe("RegistrationFlow");
  });
});
