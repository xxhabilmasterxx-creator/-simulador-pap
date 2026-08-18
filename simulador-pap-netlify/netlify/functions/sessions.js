// netlify/functions/sessions.js
//
// Guarda y lista las sesiones completadas por los estudiantes, usando
// Netlify Blobs (almacenamiento clave-valor incluido en Netlify, sin
// necesidad de contratar una base de datos externa).
//
// GET  /.netlify/functions/sessions        -> devuelve todas las sesiones
// POST /.netlify/functions/sessions        -> guarda una sesión nueva

const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const store = getStore("pap-sessions");

  if (event.httpMethod === "GET") {
    try {
      const { blobs } = await store.list();
      const sessions = [];
      for (const b of blobs) {
        try {
          const value = await store.get(b.key, { type: "json" });
          if (value) sessions.push(value);
        } catch (e) {
          // ignora entradas corruptas individuales
        }
      }
      sessions.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
      return { statusCode: 200, headers, body: JSON.stringify({ sessions }) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message, sessions: [] }) };
    }
  }

  if (event.httpMethod === "POST") {
    try {
      const session = JSON.parse(event.body || "{}");
      if (!session.studentName || !session.startTime) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Falta studentName o startTime." }) };
      }
      const key = `${session.studentName.replace(/\s+/g, "_")}_${session.startTime}`;
      await store.setJSON(key, session);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, key }) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Método no permitido." }) };
};
