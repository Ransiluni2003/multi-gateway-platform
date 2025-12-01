import { io } from "socket.io-client";

// Removed TypeScript 'declare global' block for proper type checking

(() => {
  const server = window.realtimeConfig.serverUrl;
  const socket = io(server, { transports: ["websocket"] });

  socket.on("connect", () => console.log("✅ Connected to realtime server"));

  function showToast(text) {
    let container = document.getElementById("realtime-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "realtime-toast-container";
      container.style.position = "fixed";
      container.style.top = "20px";
      container.style.right = "20px";
      container.style.zIndex = "99999";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.style.minWidth = "240px";
    toast.style.marginTop = "8px";
    toast.style.padding = "10px 14px";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
    toast.style.background = "#fff";
    toast.style.fontFamily = "sans-serif";
    toast.innerText = text;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 500);
    }, 5000);
  }

  socket.on("notification", (n) => {
    const amountPart = n.amount ? ` $${n.amount}` : "";
    const gateway = n.gateway ? ` – ${n.gateway}` : "";
    let pretty = "";

    if (n.type === "payment") pretty = `💳 New payment${amountPart} received${gateway}.`;
    else if (n.type === "refund") pretty = `↩️ Refund processed${amountPart}${gateway}.`;
    else if (n.type === "login") pretty = `🔐 ${n.message}`;
    else pretty = n.message || "New event";

    showToast(pretty);
  });
})();
