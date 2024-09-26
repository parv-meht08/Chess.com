// Establish socket connection
const socket = io();
// Initialize chess.js library
const chess = new Chess();
// Get the chessboard element from the DOM
const boardElement = document.querySelector(".chessboard");

// Variables to store the dragged piece and the source square
let draggedPiece = null;
let sourceSquare = null;
// Variable to store the player's role (either 'w' for white or 'b' for black)
let playerRole = null;

// Function to render the chessboard and pieces
const renderBoard = () => {
  const board = chess.board(); // Get current board state from chess.js
  boardElement.innerHTML = ""; // Clear the board's HTML

  // Loop through each row and square on the board
  board.forEach((row, rowIndex) => {
    row.forEach((square, squareIndex) => {
      // Create a div for each square
      const squareElement = document.createElement("div");
      // Assign light or dark class depending on square position
      squareElement.classList.add(
        "square",
        (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
      );
      
      // Add row and column info as data attributes for tracking
      squareElement.dataset.row = rowIndex;
      squareElement.dataset.column = squareIndex;

      // If a piece exists on this square
      if (square) {
        // Create a div for the piece and set its color and type
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black",
          square.type
        );
        // Set piece's Unicode symbol
        pieceElement.innerText = getPieceUnicode(square);
        // Allow dragging only if the piece belongs to the player
        pieceElement.draggable = playerRole === square.color;

        // Handle the drag start event
        pieceElement.addEventListener("dragstart", (event) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement; // Store the dragged piece
            sourceSquare = { row: rowIndex, column: squareIndex }; // Store the source square
            event.dataTransfer.setData("text/plain", ""); // Prevent default behavior
          }
        });

        // Append the piece to the square
        squareElement.appendChild(pieceElement);
      }

      // Allow the square to be a drop target by preventing default behavior
      squareElement.addEventListener("dragover", (event) => {
        event.preventDefault();
      });

      // Handle the drop event when a piece is dropped onto a square
      squareElement.addEventListener("drop", (event) => {
        event.preventDefault();
        if (draggedPiece) {
          // Get the target square's position
          const targetSquare = {
            row: parseInt(squareElement.dataset.row),
            column: parseInt(squareElement.dataset.column),
          };
          // Send move to the server
          handleMove(sourceSquare, targetSquare);
        }
      });

      // Append the square to the chessboard element
      boardElement.appendChild(squareElement);
    });
  });

  // If the player is black, flip the board (rotate 180 degrees)
  if (playerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }
};

// Function to handle a move and send it to the server
const handleMove = (source, target) => {
  // Convert row and column positions to standard chess notation
  const move = {
    from: `${String.fromCharCode(97 + source.column)}${8 - source.row}`, // e.g., 'e2'
    to: `${String.fromCharCode(97 + target.column)}${8 - target.row}`, // e.g., 'e4'
    promotion: "q", // Promote to queen by default if a pawn reaches the end
  };
  // Emit the move to the server
  socket.emit("move", move);
};

// Function to map chess pieces to their Unicode symbols
const getPieceUnicode = (piece) => {
  const unicodePieces = {
    p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", // Black pieces
    P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", // White pieces
  };
  return unicodePieces[piece.type] || "";
};

// Receive the player's role from the server
socket.on("playerRole", (role) => {
  playerRole = role; // Set player role to either 'w' or 'b'
  renderBoard(); // Render the board based on role
});

// If the user is a spectator (not a player), render the board without moves
socket.on("spectatorRole", () => {
  playerRole = null; // Spectator has no role
  renderBoard(); // Render board for spectators
});

// Receive the current board state (in FEN format) and update the board
socket.on("boardState", (fen) => {
  chess.load(fen); // Load the FEN string into chess.js
  renderBoard(); // Re-render the board
});

// Receive a move from the server and update the board
socket.on("move", (move) => {
  chess.move(move); // Apply the move to the chess.js instance
  renderBoard(); // Re-render the board
});

// Initial board rendering
renderBoard();
