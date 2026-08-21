import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const SPREADSHEET_ID = "12BH9GQTTm3vq_4_arnOzzZH_5hUiD3CiOt4oivmzxtM";
const TARGET_GID = 109946782;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // 1. Get spreadsheet metadata to find the sheet title matching our gid
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    if (!metaRes.ok) {
      const errText = await metaRes.text();
      return Response.json({ error: `Sheets metadata failed: ${metaRes.status} ${errText}` }, { status: 502 });
    }
    const meta = await metaRes.json();
    const sheet = (meta.sheets || []).find((s) => String(s.properties?.sheetId) === String(TARGET_GID));
    const sheetTitle = sheet?.properties?.title;

    if (!sheetTitle) {
      return Response.json({ error: "Could not find a sheet tab matching gid " + TARGET_GID }, { status: 404 });
    }

    // 2. Read all values from that sheet
    const range = encodeURIComponent(`${sheetTitle}!A:Z`);
    const valuesRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`,
      { headers: { "Authorization": `Bearer ${accessToken}` } }
    );
    if (!valuesRes.ok) {
      const errText = await valuesRes.text();
      return Response.json({ error: `Sheets values failed: ${valuesRes.status} ${errText}` }, { status: 502 });
    }
    const valuesData = await valuesRes.json();
    const rows = valuesData.values || [];

    // rows[0] is the header; Name is col B (index 1), ID/Alias is col C (index 2)
    const players = rows.slice(1)
      .filter((r) => r[1] && String(r[1]).trim())
      .map((r, i) => ({
        name: String(r[1] || "").trim(),
        alias: String(r[2] || "").trim(),
        order: i,
      }));

    return Response.json({ sheetTitle, players, count: players.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}