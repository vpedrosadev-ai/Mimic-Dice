export function onRequestGet(context) {
  const url = new URL(context.request.url);
  url.pathname = "/";
  url.searchParams.set("view", "monsters-league");
  return Response.redirect(url.href, 302);
}
