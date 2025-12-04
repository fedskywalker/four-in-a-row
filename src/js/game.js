/**
 * Four in a Row - Game Logic
 * Handles board state, move validation, and win detection
 */

export const ROWS = 6;
export const COLS = 7;
export const EMPTY = 0;
export const PLAYER_RED = 1;
export const PLAYER_YELLOW = 2;

/**
 * Creates a new empty game board
 * @returns {number[][]} 2D array representing the board (row 0 is top)
 */
export function createBoard() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));
}

/**
 * Clones a board state
 * @param {number[][]} board
 * @returns {number[][]}
 */
export function cloneBoard(board) {
  return board.map(row => [...row]);
}

/**
 * Gets the lowest empty row in a column
 * @param {number[][]} board
 * @param {number} col
 * @returns {number} Row index or -1 if column is full
 */
export function getLowestEmptyRow(board, col) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === EMPTY) {
      return row;
    }
  }
  return -1;
}

/**
 * Checks if a column is full
 * @param {number[][]} board
 * @param {number} col
 * @returns {boolean}
 */
export function isColumnFull(board, col) {
  return board[0][col] !== EMPTY;
}

/**
 * Checks if the board is completely full
 * @param {number[][]} board
 * @returns {boolean}
 */
export function isBoardFull(board) {
  return board[0].every(cell => cell !== EMPTY);
}

/**
 * Drops a piece into a column
 * @param {number[][]} board
 * @param {number} col
 * @param {number} player
 * @returns {{success: boolean, row: number, board: number[][]}}
 */
export function dropPiece(board, col, player) {
  if (col < 0 || col >= COLS) {
    return { success: false, row: -1, board };
  }

  const row = getLowestEmptyRow(board, col);
  if (row === -1) {
    return { success: false, row: -1, board };
  }

  const newBoard = cloneBoard(board);
  newBoard[row][col] = player;

  return { success: true, row, board: newBoard };
}

/**
 * Checks for a win condition and returns winning cells if found
 * @param {number[][]} board
 * @param {number} player
 * @returns {{won: boolean, cells: {row: number, col: number}[]}}
 */
export function checkWin(board, player) {
  // Check horizontal
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      if (
        board[row][col] === player &&
        board[row][col + 1] === player &&
        board[row][col + 2] === player &&
        board[row][col + 3] === player
      ) {
        return {
          won: true,
          cells: [
            { row, col },
            { row, col: col + 1 },
            { row, col: col + 2 },
            { row, col: col + 3 }
          ]
        };
      }
    }
  }

  // Check vertical
  for (let row = 0; row <= ROWS - 4; row++) {
    for (let col = 0; col < COLS; col++) {
      if (
        board[row][col] === player &&
        board[row + 1][col] === player &&
        board[row + 2][col] === player &&
        board[row + 3][col] === player
      ) {
        return {
          won: true,
          cells: [
            { row, col },
            { row: row + 1, col },
            { row: row + 2, col },
            { row: row + 3, col }
          ]
        };
      }
    }
  }

  // Check diagonal (bottom-left to top-right)
  for (let row = 3; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      if (
        board[row][col] === player &&
        board[row - 1][col + 1] === player &&
        board[row - 2][col + 2] === player &&
        board[row - 3][col + 3] === player
      ) {
        return {
          won: true,
          cells: [
            { row, col },
            { row: row - 1, col: col + 1 },
            { row: row - 2, col: col + 2 },
            { row: row - 3, col: col + 3 }
          ]
        };
      }
    }
  }

  // Check diagonal (top-left to bottom-right)
  for (let row = 0; row <= ROWS - 4; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      if (
        board[row][col] === player &&
        board[row + 1][col + 1] === player &&
        board[row + 2][col + 2] === player &&
        board[row + 3][col + 3] === player
      ) {
        return {
          won: true,
          cells: [
            { row, col },
            { row: row + 1, col: col + 1 },
            { row: row + 2, col: col + 2 },
            { row: row + 3, col: col + 3 }
          ]
        };
      }
    }
  }

  return { won: false, cells: [] };
}

/**
 * Gets the other player
 * @param {number} player
 * @returns {number}
 */
export function getOtherPlayer(player) {
  return player === PLAYER_RED ? PLAYER_YELLOW : PLAYER_RED;
}

/**
 * Gets player color name
 * @param {number} player
 * @returns {string}
 */
export function getPlayerColor(player) {
  return player === PLAYER_RED ? 'red' : 'yellow';
}

/**
 * Game state class
 */
export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = createBoard();
    this.currentPlayer = PLAYER_RED;
    this.winner = null;
    this.winningCells = [];
    this.isDraw = false;
    this.moveHistory = [];
    this.gameOver = false;
  }

  /**
   * Makes a move
   * @param {number} col
   * @returns {{success: boolean, row: number, winner: number|null, winningCells: array, isDraw: boolean}}
   */
  makeMove(col) {
    if (this.gameOver) {
      return { success: false, row: -1, winner: null, winningCells: [], isDraw: false };
    }

    const result = dropPiece(this.board, col, this.currentPlayer);

    if (!result.success) {
      return { success: false, row: -1, winner: null, winningCells: [], isDraw: false };
    }

    this.board = result.board;
    this.moveHistory.push({ col, row: result.row, player: this.currentPlayer });

    // Check for win
    const winResult = checkWin(this.board, this.currentPlayer);
    if (winResult.won) {
      this.winner = this.currentPlayer;
      this.winningCells = winResult.cells;
      this.gameOver = true;
      return {
        success: true,
        row: result.row,
        winner: this.winner,
        winningCells: this.winningCells,
        isDraw: false
      };
    }

    // Check for draw
    if (isBoardFull(this.board)) {
      this.isDraw = true;
      this.gameOver = true;
      return {
        success: true,
        row: result.row,
        winner: null,
        winningCells: [],
        isDraw: true
      };
    }

    // Switch player
    this.currentPlayer = getOtherPlayer(this.currentPlayer);

    return {
      success: true,
      row: result.row,
      winner: null,
      winningCells: [],
      isDraw: false
    };
  }

  /**
   * Gets valid columns for moves
   * @returns {number[]}
   */
  getValidColumns() {
    const valid = [];
    for (let col = 0; col < COLS; col++) {
      if (!isColumnFull(this.board, col)) {
        valid.push(col);
      }
    }
    return valid;
  }

  /**
   * Serializes the game state for network transmission
   * @returns {object}
   */
  serialize() {
    return {
      board: this.board,
      currentPlayer: this.currentPlayer,
      winner: this.winner,
      winningCells: this.winningCells,
      isDraw: this.isDraw,
      moveHistory: this.moveHistory,
      gameOver: this.gameOver
    };
  }

  /**
   * Loads a serialized game state
   * @param {object} data
   */
  deserialize(data) {
    this.board = data.board;
    this.currentPlayer = data.currentPlayer;
    this.winner = data.winner;
    this.winningCells = data.winningCells;
    this.isDraw = data.isDraw;
    this.moveHistory = data.moveHistory;
    this.gameOver = data.gameOver;
  }
}
