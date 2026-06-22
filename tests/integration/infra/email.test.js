import email from "infra/email.js";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("infra/email.js", () => {
  test("send()", async () => {
    await orchestrator.deleteAllEmails();
    await email.send({
      from: "Ihascional <ismael@gmail.com>",
      to: "ismasantana@hotmail.com",
      subject: "Teste de Assunto",
      text: "Teste de corpo",
    });
    await email.send({
      from: "Ihascional <ismael@gmail.com>",
      to: "ismasantana@hotmail.com",
      subject: "Último email enviado",
      text: "Corpo do último email",
    });

    const lastEmail = await orchestrator.getLastEmail();
    console.log(lastEmail);

    expect(lastEmail.sender).toBe("<ismael@gmail.com>");
    expect(lastEmail.recipients[0]).toBe("<ismasantana@hotmail.com>");
    expect(lastEmail.subject).toBe("Último email enviado");
    expect(lastEmail.text).toBe("Corpo do último email\r\n");
  });
});
