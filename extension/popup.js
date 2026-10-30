const toggleBtn = document.getElementById('toggleBtn');
const alvoSelect = document.getElementById('alvoPosicao');
const decInput = document.getElementById('decremento');
const tempoDifInput = document.getElementById('tempoDif');
const exeqInput = document.getElementById('exeq');
const precoMinInput = document.getElementById('precoMinimo');
const logArea = document.getElementById('log-area');
const cnpjDisplay = document.getElementById('cnpj-display');

async function getCnpj() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return null;
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const text = document.body.innerText;
        const match = text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
        return match ? match[0].replace(/\D/g, '') : null;
      }
    });
    return result[0].result;
  } catch (e) { return null; }
}

async function loadConfig() {
  const cnpj = await getCnpj();
  if (!cnpj) {
    logArea.innerText = "Navegue para o portal...";
    return;
  }
  
  cnpjDisplay.innerText = "CNPJ: " + cnpj;
  const res = await fetch(`http://localhost:3001/api/config/estrategia?cnpj=${cnpj}`);
  const data = await res.json();
  
  alvoSelect.value = data.alvo || "1";
  decInput.value = data.decremento || "0.01";
  tempoDifInput.value = data.tempoDif || "3";
  exeqInput.value = data.exeq || "50";
  precoMinInput.value = data.precoMinimo || "0";
  
  if (data.ativo) {
    toggleBtn.innerText = "DESLIGAR BOT";
    toggleBtn.className = "switch-btn btn-on";
  }
}

// Polling de alertas a cada 3 segundos
setInterval(async () => {
  const cnpj = await getCnpj();
  if (!cnpj) return;
  const res = await fetch(`http://localhost:3001/api/alertas?cnpj=${cnpj}`);
  const data = await res.json();
  if (data.mensagem) {
    const div = document.createElement("div");
    div.style.color = "yellow";
    div.style.fontSize = "10px";
    div.innerText = data.mensagem;
    logArea.prepend(div);
  }
}, 3000);

toggleBtn.addEventListener('click', async () => {
  const cnpj = await getCnpj();
  if (!cnpj) return alert("CNPJ não detectado!");
  
  const isNowActive = toggleBtn.innerText === "LIGAR BOT";
  const config = {
    cnpj,
    alvo: alvoSelect.value,
    decremento: decInput.value,
    tempoDif: tempoDifInput.value,
    exeq: exeqInput.value,
    precoMinimo: precoMinInput.value,
    ativo: isNowActive
  };

  await fetch('http://localhost:3001/api/config/estrategia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  
  toggleBtn.innerText = isNowActive ? "DESLIGAR BOT" : "LIGAR BOT";
  toggleBtn.className = `switch-btn ${isNowActive ? 'btn-on' : 'btn-off'}`;
  logArea.innerText = isNowActive ? "Bot Ligado!" : "Bot Desligado!";
});

window.onload = loadConfig;