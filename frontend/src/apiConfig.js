// apiConfig.js
let baseUrl;
let socketUrl;

// Get local IP address
const localIP = window.location.hostname === 'localhost' 
  ? '127.0.0.1'  // Local development
  : window.location.hostname;  // Local network

// if (import.meta.env.VITE_NODE_ENV === "production") {
//   baseUrl = "your-deployed-URL";
//   socketUrl = "wss://your-deployed-url";
// } else {
  baseUrl = `http://${localIP}:4000`;
  socketUrl = `ws://${localIP}:4000`;
// }

export { baseUrl, socketUrl };