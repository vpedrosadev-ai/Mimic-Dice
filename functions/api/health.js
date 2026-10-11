export async function onRequestGet() {
  return Response.json({
    ok: true,
    service: "mimic-dice",
    checkedAt: new Date().toISOString()
  }, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex"
    }
  });
}
