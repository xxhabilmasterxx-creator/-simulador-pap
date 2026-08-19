// netlify/functions/cases.js
//
// Permite que el modo docente agregue, edite, oculte y borre casos del
// simulador sin tocar código. Los cambios se guardan en Netlify Blobs,
// en un store aparte del de las sesiones.
//
// GET    /.netlify/functions/cases        -> devuelve los casos personalizados/editados
// POST   /.netlify/functions/cases        -> crea o actualiza un caso (por su id)
// DELETE /.netlify/functions/cases        -> borra un caso personalizado, o quita el
//                                             "ocultamiento" de un caso incorporado

const { getStore } = require("@netlify/blobs");

function getCasesStore(){
  return (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN)
    ? getStore({
        name: "pap-cases",
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_BLOBS_TOKEN
      })
    : getStore("pap-cases");
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const store = getCasesStore();

  if (event.httpMethod === "GET") {
    try {
      const { blobs } = await store.list();
      const cases = [];
      for (const b of blobs) {
        try {
          const value = await store.get(b.key, { type: "json" });
          if (value) cases.push(value);
        } catch (e) { /* ignora entradas corruptas individuales */ }
      }
      return { statusCode: 200, headers, body: JSON.stringify({ cases }) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message, cases: [] }) };
    }
  }

  if (event.httpMethod === "POST") {
    try {
      const caseObj = JSON.parse(event.body || "{}");
      if (!caseObj.id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Falta el id del caso." }) };
      }
      await store.setJSON(caseObj.id, caseObj);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: caseObj.id }) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  if (event.httpMethod === "DELETE") {
    try {
      const { id } = JSON.parse(event.body || "{}");
      if (!id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Falta el id del caso." }) };
      }
      await store.delete(id);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Método no permitido." }) };
};
