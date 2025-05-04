// Load environment variables from .env file
require("dotenv").config();

// Import required dependencies
const express = require("express");
const cors = require("cors");
const app = express();
const connection = require("./db/db.js");
const userRoute = require("./routes/userRoute.js");
const avatarRoute = require("./routes/avatarRoute.js");
const cookieParser = require('cookie-parser');
const createWebSocketServer = require("./wsServer.js");
const path = require("path");
console.log(1);
// Connect to database
connection()
console.log(2);
// Middleware setup
// Parse incoming JSON requests
app.use(express.json());
// Parse cookies
app.use(cookieParser());
console.log(3);
// CORS configuration
// Define allowed origins for cross-origin requests
const allowedOrigins = [
  "http://localhost:5173",  // Vite development server
  "http://localhost:4000",  // Alternative local development port
  "https://swifty-chatty-appy.onrender.com"  // Production URL
];

// CORS options configuration
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests from allowed origins or no origin (localhost)
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",  // Allowed HTTP methods
    optionsSuccessStatus: 204,                  // Status code for preflight requests
    credentials: true,                         // Allow credentials (cookies, auth headers)
};
app.use(cors(corsOptions));

// Route handlers
// User-related API endpoints
app.use("/api/user", userRoute);
// Avatar-related API endpoints
app.use("/api/avatar", avatarRoute);
console.log(4);
// Server configuration
const port = process.env.PORT || 4000;  // Use environment port or default to 4000
const server = app.listen(port, '0.0.0.0', () => 
    console.log(`Application Running on Port ${port}`)
);

// WebSocket setup
createWebSocketServer(server);  // Initialize WebSocket server for real-time communication

// // Static file serving
// // Serve static files from the frontend build directory
// app.use(express.static(path.join(__dirname, "..", "frontend", "dist")));

// // Handle all other routes by serving the main index.html
// // This enables client-side routing
// app.get("*", (req, res) => {
//     res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
// });
app.get("/", (req, res) => {
    res.send("Hello World!");
});
console.log(5);
