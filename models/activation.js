import email from "infra/email.js";
import database from "infra/database.js";
import webserver from "infra/webserver";
import { ForbiddenError, NotFoundError } from "infra/errors";
import user from "models/user.js";
import authorization from "./authorization";

const EXPIRATION_IN_MILLISECONDS = 60 * 15 * 1000; // 15 minutes

async function create(userId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const newToken = await runInsertQuery(userId, expiresAt);

  return newToken;

  async function runInsertQuery(userId, expiresAt) {
    const results = await database.query({
      text: `
        INSERT INTO
          user_activation_tokens (user_id, expires_at)
        VALUES
          ($1, $2)
        RETURNING 
         *
      `,
      values: [userId, expiresAt],
    });

    return results.rows[0];
  }
}

async function sendEmailToUser(user, activationToken) {
  await email.send({
    from: "IHAS <ismael@gmail.com>",
    to: user.email,
    subject: "Ative seu cadastro no site!",
    text: `${user.username}, clique no link abaixo para ativar o seu cadastro no site!

  ${webserver.origin}/cadastro/ativar/${activationToken.id}

  Atenciosamente,

  IHAS, o invencível
        `,
  });
}

async function findOneByUserId(userId) {
  const userFound = await runSelectQuery(userId);

  return userFound;

  async function runSelectQuery(userId) {
    const results = await database.query({
      text: `
               SELECT 
                *
               FROM 
                user_activation_tokens
              WHERE 
                user_id = $1
              LIMIT 1
                ;
                `,
      values: [userId],
    });
    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "O username informado não foi encontrado no sistema",
        action: "Verifique se o username está digitado corretamente.",
      });
    }
    return results.rows[0];
  }
}

async function findOneValidById(tokenId) {
  const tokenFound = await runSelectQuery(tokenId);

  return tokenFound;

  async function runSelectQuery(tokenId) {
    const results = await database.query({
      text: `
        SELECT
          *
        FROM
          user_activation_tokens
        WHERE
          id = $1 AND
          expires_at > NOW() AND
          used_at IS NULL
        LIMIT 1

      `,
      values: [tokenId],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message:
          "O token de ativação utilizado não foi encontrado no sistema ou expirou.",
        action: "Faça um novo cadastro.",
      });
    }
    return results.rows[0];
  }
}

async function markTokenAsUsed(activationTokenId) {
  const usedActivationToken = await runUpdateQuery(activationTokenId);
  return usedActivationToken;

  async function runUpdateQuery(activationTokenId) {
    const results = await database.query({
      text: `
      UPDATE user_activation_tokens
      SET 
        used_at = timezone('utc', now()),
        expires_at = timezone('utc', now())
      WHERE
        id = $1
      RETURNING
        *
      `,
      values: [activationTokenId],
    });

    return results.rows[0];
  }
}

async function activateUserByUserId(userId) {
  const userToActivate = await user.findOneById(userId);

  if (!authorization.can(userToActivate, "read:activation_token")) {
    throw new ForbiddenError({
      message: "Você não pode mais utilizar tokens de ativação.",
      action: "Entre em contato com o suporte.",
    });
  }

  const activatedUser = await user.setFeatures(userId, [
    "create:session",
    "read:session",
  ]);
  return activatedUser;
}
const activation = {
  sendEmailToUser,
  create,
  findOneByUserId,
  findOneValidById,
  markTokenAsUsed,
  activateUserByUserId,
};

export default activation;
