import { assertServerBindings } from "../../_shared/auth.js";
import { assertSameOrigin, errorResponse, HttpError, jsonResponse, readJsonBody } from "../../_shared/http.js";
import { createRegistrationToken, getRegistrationCookie, secureTextEquals } from "../../_shared/invitation.js";

export async function onRequestPost(context) {
  try {
    assertServerBindings(context.env, ["REGISTRATION_CODE"]);
    assertSameOrigin(context.request);
    const body = await readJsonBody(context.request, 2048);
    const allowed = await secureTextEquals(body.code, context.env.REGISTRATION_CODE);

    if (!allowed) {
      throw new HttpError(403, "invalid_registration_code", "Invalid registration code.");
    }

    const token = await createRegistrationToken(context.env.AUTH_SECRET);
    return jsonResponse(
      { authorized: true },
      200,
      { "Set-Cookie": getRegistrationCookie(token, context.request) }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
