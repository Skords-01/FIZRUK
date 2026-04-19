import { getSessionUser } from "../auth.js";

/**
 * Router-level auth-middleware. Резолвить Better Auth сесію, кладе юзера в
 * `req.user` і кличе `next()`. Якщо сесії немає або lookup впав — 401.
 *
 * Handler-у не треба більше власноруч кликати `getSessionUser` + перевіряти
 * null + віддавати 401 — він просто читає `req.user`.
 *
 * @returns {import("express").RequestHandler}
 */
export function requireSession() {
  return async (req, res, next) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res
          .status(401)
          .json({ error: "Потрібна автентифікація", code: "UNAUTHORIZED" });
      }
      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}
