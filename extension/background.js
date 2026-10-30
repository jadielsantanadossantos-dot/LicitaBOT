// background.js - Captura cookies e CNPJ e envia para a API
const API_URL = "http://localhost:3001/api/update-session";

// Função para extrair CNPJ do storage
async function getActiveCnpj() {
  return new Promise((resolve) => {
    chrome.storage.local.get("lastActiveCnpj", (data) => {
      resolve(data.lastActiveCnpj || null);
    });
  });
}

async function syncCookies() {
  const cnpj = await getActiveCnpj();
  if (!cnpj) return;

  chrome.cookies.getAll({ domain: ".portaldecompraspublicas.com.br" }, (cookies) => {
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, cookies })
    }).catch(err => console.error("Erro ao sincronizar:", err));
  });
}

// Escuta mensagens do popup para atualizar o CNPJ ativo
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "SET_CNPJ") {
    chrome.storage.local.set({ lastActiveCnpj: request.cnpj });
  }
});

chrome.cookies.onChanged.addListener(syncCookies);
setInterval(syncCookies, 60000); // Garante sync a cada 1min