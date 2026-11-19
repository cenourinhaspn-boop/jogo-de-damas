const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("reset-btn");

const SIZE = 8;
let board = [];
let currentTurn = "light";
let selected = null;
let validMoves = [];
let mustContinueCapture = false;
let gameOver = false;

function initGame() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  currentTurn = "light";
  selected = null;
  validMoves = [];
  mustContinueCapture = false;
  gameOver = false;

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if ((row + col) % 2 === 1) {
        if (row < 3) {
          board[row][col] = { color: "dark", king: false };
        } else if (row > 4) {
          board[row][col] = { color: "light", king: false };
        }
      }
    }
  }
  updateStatus();
  renderBoard();
}

function isInside(row, col) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function getPieceMoves(row, col, onlyCaptures = false) {
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];
  const directions = piece.king
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.color === "light"
    ? [[-1, -1], [-1, 1]]
    : [[1, -1], [1, 1]];

  const captureDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  // Verifica capturas (em todas as 4 diagonais)
  for (const [dr, dc] of captureDirs) {
    const midRow = row + dr;
    const midCol = col + dc;
    const destRow = row + dr * 2;
    const destCol = col + dc * 2;

    if (isInside(destRow, destCol)) {
      const midPiece = board[midRow][midCol];
      if (midPiece && midPiece.color !== piece.color && board[destRow][destCol] === null) {
        moves.push({
          toRow: destRow,
          toCol: destCol,
          captured: { row: midRow, col: midCol }
        });
      }
    }
  }

  // Se houver captura disponível ou se for captura em cadeia, não permite movimento simples
  if (onlyCaptures || moves.length > 0) {
    return moves;
  }

  // Movimentos simples
  for (const [dr, dc] of directions) {
    const destRow = row + dr;
    const destCol = col + dc;
    if (isInside(destRow, destCol) && board[destRow][destCol] === null) {
      moves.push({
        toRow: destRow,
        toCol: destCol,
        captured: null
      });
    }
  }

  return moves;
}

function playerHasCapture(color) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] && board[r][c].color === color) {
        const moves = getPieceMoves(r, c, true);
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}

function selectPiece(row, col) {
  if (mustContinueCapture) return;

  const piece = board[row][col];
  if (!piece || piece.color !== currentTurn) return;

  const mustCapture = playerHasCapture(currentTurn);
  const moves = getPieceMoves(row, col, mustCapture);

  selected = { row, col };
  validMoves = moves;
  renderBoard();
}

function executeMove(move) {
  const piece = board[selected.row][selected.col];
  board[move.toRow][move.toCol] = piece;
  board[selected.row][selected.col] = null;

  if (move.captured) {
    board[move.captured.row][move.captured.col] = null;
  }

  // Promoção a Dama
  let promoted = false;
  if (!piece.king) {
    if ((piece.color === "light" && move.toRow === 0) ||
        (piece.color === "dark" && move.toRow === SIZE - 1)) {
      piece.king = true;
      promoted = true;
    }
  }

  // Verifica captura múltipla se houve captura e não acabou de virar dama
  if (move.captured && !promoted) {
    const nextCaptures = getPieceMoves(move.toRow, move.toCol, true);
    if (nextCaptures.length > 0) {
      selected = { row: move.toRow, col: move.toCol };
      validMoves = nextCaptures;
      mustContinueCapture = true;
      updateStatus("Captura múltipla obrigatória!");
      renderBoard();
      return;
    }
  }

  // Passa o turno
  mustContinueCapture = false;
  selected = null;
  validMoves = [];
  currentTurn = currentTurn === "light" ? "dark" : "light";

  checkWinCondition();
  if (!gameOver) {
    updateStatus();
  }
  renderBoard();
}

function checkWinCondition() {
  let lightPieces = 0;
  let darkPieces = 0;
  let currentHasMoves = false;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = board[r][c];
      if (p) {
        if (p.color === "light") lightPieces++;
        else darkPieces++;

        if (p.color === currentTurn && !currentHasMoves) {
          if (getPieceMoves(r, c).length > 0) {
            currentHasMoves = true;
          }
        }
      }
    }
  }

  if (lightPieces === 0 || (currentTurn === "light" && !currentHasMoves)) {
    gameOver = true;
    updateStatus("Fim de jogo! As peças escuras venceram!");
  } else if (darkPieces === 0 || (currentTurn === "dark" && !currentHasMoves)) {
    gameOver = true;
    updateStatus("Fim de jogo! As peças claras venceram!");
  }
}

function updateStatus(customText) {
  if (customText) {
    statusEl.textContent = customText;
    return;
  }
  const turnText = currentTurn === "light" ? "Vez das peças claras" : "Vez das peças escuras";
  const captureWarning = playerHasCapture(currentTurn) ? " (Captura obrigatória)" : "";
  statusEl.textContent = turnText + captureWarning;
}

function handleSquareClick(row, col) {
  if (gameOver) return;

  const move = validMoves.find(m => m.toRow === row && m.toCol === col);
  if (move) {
    executeMove(move);
    return;
  }

  const clickedPiece = board[row][col];
  if (clickedPiece && clickedPiece.color === currentTurn) {
    selectPiece(row, col);
  } else if (!mustContinueCapture) {
    selected = null;
    validMoves = [];
    renderBoard();
  }
}

function renderBoard() {
  boardEl.innerHTML = "";

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const square = document.createElement("div");
      const isDark = (row + col) % 2 === 1;
      square.className = `square ${isDark ? "dark" : "light"}`;

      if (validMoves.some(m => m.toRow === row && m.toCol === col)) {
        square.classList.add("valid-move");
      }

      const piece = board[row][col];
      if (piece) {
        const pieceEl = document.createElement("div");
        pieceEl.className = `piece ${piece.color}${piece.king ? " king" : ""}`;
        if (selected && selected.row === row && selected.col === col) {
          pieceEl.classList.add("selected");
        }
        square.appendChild(pieceEl);
      }

      square.addEventListener("click", () => handleSquareClick(row, col));
      boardEl.appendChild(square);
    }
  }
}

resetBtn.addEventListener("click", initGame);
initGame();
