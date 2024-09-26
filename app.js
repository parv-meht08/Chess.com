const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);
const chess = new Chess(); // Create a new chess game instance
let players = {}; // Track player connections (white and black)

// Set EJS as the view engine and serve static files from 'public' folder
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Route to render the chessboard page
app.get("/", (req, res) => {
  res.render("index", { title: "My Chess.com" });
});

// Handle WebSocket connections
io.on("connection", (uniquesocket) => {
  // Assign player roles ('white' or 'black') to the first two connected players
  if (!players.white) {
    players.white = uniquesocket.id; // First player is white
    uniquesocket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = uniquesocket.id; // Second player is black
    uniquesocket.emit("playerRole", "b");
  } else {
    uniquesocket.emit("spectatorRole"); // Any additional players become spectators
  }

  // Handle disconnection of a player
  uniquesocket.on("disconnect", () => {
    if (uniquesocket.id === players.white) {
      delete players.white; // Remove white player on disconnect
    } else if (uniquesocket.id === players.black) {
      delete players.black; // Remove black player on disconnect
    }
  });

  // Handle a move sent from a player
  uniquesocket.on("move", (move) => {
    try {
      // Ensure the correct player is making the move
      if (chess.turn() === "w" && uniquesocket.id === players.black) return;
      if (chess.turn() === "b" && uniquesocket.id === players.white) return;

      // Make the move using chess.js and broadcast to all players if valid
      const result = chess.move(move);
      if (result) {
        io.emit("move", move); // Send the move to all connected clients
        io.emit("boardState", chess.fen()); // Send the new board state to all clients
      }
    } catch (error) {
      uniquesocket.emit("Invalid move: ", move); // Handle invalid move errors
    }
  });
});

// Start the server on port 3000
server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
