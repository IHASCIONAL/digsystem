import orchestrator from "tests/orchestrator.js";
import { version as uuidVersion } from "uuid";
import user from "models/user.js";
import password from "models/password.js";
import authorization from "models/authorization.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/users", () => {
  describe("Anonymous user", () => {
    test("Cannot create a user (registration is closed)", async () => {
      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "semlogin",
          email: "semlogin@gmail.com",
          password: "123456",
        }),
      });

      expect(response.status).toBe(403);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar esta ação.",
        action: `Verifique se o seu usuário possui a feature "create:user"`,
        status_code: 403,
      });
    });
  });

  describe("Collaborator user", () => {
    test("Cannot create a user", async () => {
      const collaborator = await orchestrator.createCollaborator({});
      const collaboratorSession = await orchestrator.createSession(
        collaborator.id,
      );

      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${collaboratorSession.token}`,
        },
        body: JSON.stringify({
          username: "outrocolaborador",
          email: "outrocolaborador@gmail.com",
          password: "123456",
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe("Admin user", () => {
    test("With unique and valid data", async () => {
      const admin = await orchestrator.createAdmin({});
      const adminSession = await orchestrator.createSession(admin.id);

      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          username: "novocolaborador",
          email: "novocolaborador@gmail.com",
          password: "123456",
          features: authorization.collaboratorFeatures,
        }),
      });

      expect(response.status).toBe(201);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "novocolaborador",
        features: authorization.collaboratorFeatures,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      const userInDatabase = await user.findOneByUsername("novocolaborador");
      const correctPasswordMatch = await password.compare(
        "123456",
        userInDatabase.password,
      );
      const incorrectPasswordMatch = await password.compare(
        "SenhaErrada",
        userInDatabase.password,
      );

      expect(correctPasswordMatch).toBe(true);
      expect(incorrectPasswordMatch).toBe(false);
    });

    test("With duplicated email", async () => {
      const admin = await orchestrator.createAdmin({});
      const adminSession = await orchestrator.createSession(admin.id);

      const response1 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          username: "emailduplicado1",
          email: "duplicado@gmail.com",
          password: "123456",
        }),
      });

      expect(response1.status).toBe(201);

      const response2 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          username: "emailduplicado2",
          email: "Duplicado@gmail.com",
          password: "123456",
        }),
      });

      expect(response2.status).toBe(400);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        name: "ValidationError",
        message: "O email informado já está sendo utilizado",
        action: "Utilize outro email para esta operação.",
        status_code: 400,
      });
    });

    test("With duplicated username", async () => {
      const admin = await orchestrator.createAdmin({});
      const adminSession = await orchestrator.createSession(admin.id);

      const response1 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          username: "usernameduplicado",
          email: "teste_username_duplicado1@gmail.com",
          password: "123456",
        }),
      });

      expect(response1.status).toBe(201);

      const response2 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          username: "uSernameduplicado",
          email: "teste_username_duplicado2@gmail.com",
          password: "123456",
        }),
      });

      expect(response2.status).toBe(400);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        name: "ValidationError",
        message: "O username informado já está sendo utilizado",
        action: "Utilize outro username para esta operação.",
        status_code: 400,
      });
    });
  });
});
