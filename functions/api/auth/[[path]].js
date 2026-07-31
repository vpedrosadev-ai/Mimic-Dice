import { Auth } from "@auth/core";
import Google from "@auth/core/providers/google";
import { D1Adapter } from "@auth/d1-adapter";
import { assertServerBindings } from "../../_shared/auth.js";
import { errorResponse } from "../../_shared/http.js";
import {
  getClearedRegistrationCookie,
  readCookie,
  REGISTRATION_COOKIE_NAME,
  verifyRegistrationToken
} from "../../_shared/invitation.js";

async function isExistingGoogleUser(db, account, profile) {
  const providerAccountId = String(account?.providerAccountId || "");

  if (providerAccountId) {
    const accountUser = await db.prepare(`
      SELECT u."id"
      FROM "accounts" a
      INNER JOIN "users" u ON u."id" = a."userId"
      WHERE a."provider" = 'google' AND a."providerAccountId" = ?
      LIMIT 1
    `).bind(providerAccountId).first();

    if (accountUser?.id) {
      return true;
    }
  }

  const email = String(profile?.email || "").trim().toLowerCase();

  if (!email) {
    return false;
  }

  const emailUser = await db.prepare(
    'SELECT "id" FROM "users" WHERE lower("email") = ? LIMIT 1'
  ).bind(email).first();
  return Boolean(emailUser?.id);
}

export async function onRequest(context) {
  try {
    assertServerBindings(context.env, ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "REGISTRATION_CODE"]);
    const registrationToken = readCookie(context.request, REGISTRATION_COOKIE_NAME);
    const registrationAuthorized = await verifyRegistrationToken(registrationToken, context.env.AUTH_SECRET);
    const response = await Auth(context.request, {
      adapter: D1Adapter(context.env.DB),
      basePath: "/api/auth",
      secret: context.env.AUTH_SECRET,
      trustHost: true,
      session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60
      },
      providers: [
        Google({
          clientId: context.env.GOOGLE_CLIENT_ID,
          clientSecret: context.env.GOOGLE_CLIENT_SECRET,
          authorization: {
            params: {
              prompt: "select_account"
            }
          }
        })
      ],
      pages: {
        error: "/"
      },
      callbacks: {
        async signIn({ account, profile }) {
          if (account?.provider !== "google" || profile?.email_verified !== true) {
            return false;
          }

          if (await isExistingGoogleUser(context.env.DB, account, profile)) {
            return true;
          }

          return registrationAuthorized;
        },
        async jwt({ token, user }) {
          if (user?.id) {
            token.sub = String(user.id);
          }
          return token;
        },
        async session({ session, token }) {
          if (session.user && token?.sub) {
            session.user.id = String(token.sub);
          }
          return session;
        },
        async redirect({ url, baseUrl }) {
          if (url.startsWith("/")) {
            return `${baseUrl}${url}`;
          }

          try {
            return new URL(url).origin === baseUrl ? url : baseUrl;
          } catch {
            return baseUrl;
          }
        }
      }
    });

    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");

    if (new URL(context.request.url).pathname.endsWith("/callback/google")) {
      headers.append("Set-Cookie", getClearedRegistrationCookie(context.request));
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    return errorResponse(error);
  }
}
