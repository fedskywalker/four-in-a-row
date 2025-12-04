/**
 * Four in a Row - Multiplayer Networking
 * Socket.IO based real-time multiplayer
 */

import { io } from 'socket.io-client';

export class NetworkManager {
  constructor(options = {}) {
    this.socket = null;
    this.gameCode = null;
    this.playerId = null;
    this.playerNumber = null; // 1 or 2
    this.isHost = false;
    this.connected = false;

    // Callbacks
    this.onConnected = options.onConnected || (() => {});
    this.onDisconnected = options.onDisconnected || (() => {});
    this.onGameCreated = options.onGameCreated || (() => {});
    this.onGameJoined = options.onGameJoined || (() => {});
    this.onOpponentJoined = options.onOpponentJoined || (() => {});
    this.onOpponentLeft = options.onOpponentLeft || (() => {});
    this.onOpponentMove = options.onOpponentMove || (() => {});
    this.onGameState = options.onGameState || (() => {});
    this.onError = options.onError || (() => {});
    this.onRematch = options.onRematch || (() => {});
  }

  /**
   * Connect to the game server
   * @param {string} serverUrl - Server URL (defaults to current host)
   * @returns {Promise<void>}
   */
  connect(serverUrl = '') {
    return new Promise((resolve, reject) => {
      try {
        // Determine server URL
        const url = serverUrl || window.location.origin;

        this.socket = io(url, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
          this.connected = true;
          this.playerId = this.socket.id;
          this.onConnected();
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          this.connected = false;
          this.onDisconnected(reason);
        });

        this.socket.on('connect_error', (error) => {
          reject(error);
        });

        // Game events
        this.socket.on('game:created', (data) => {
          this.gameCode = data.gameCode;
          this.playerNumber = 1;
          this.isHost = true;
          this.onGameCreated(data);
        });

        this.socket.on('game:joined', (data) => {
          this.gameCode = data.gameCode;
          this.playerNumber = data.playerNumber;
          this.isHost = data.playerNumber === 1;
          this.onGameJoined(data);
        });

        this.socket.on('game:opponent-joined', (data) => {
          this.onOpponentJoined(data);
        });

        this.socket.on('game:opponent-left', (data) => {
          this.onOpponentLeft(data);
        });

        this.socket.on('game:move', (data) => {
          this.onOpponentMove(data);
        });

        this.socket.on('game:state', (data) => {
          this.onGameState(data);
        });

        this.socket.on('game:rematch', (data) => {
          this.onRematch(data);
        });

        this.socket.on('game:error', (data) => {
          this.onError(data);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.gameCode = null;
    this.playerId = null;
    this.playerNumber = null;
    this.isHost = false;
  }

  /**
   * Create a new game room
   * @returns {Promise<string>} Game code
   */
  createGame() {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('game:create', {}, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.gameCode);
        }
      });
    });
  }

  /**
   * Join an existing game
   * @param {string} gameCode
   * @returns {Promise<void>}
   */
  joinGame(gameCode) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('game:join', { gameCode: gameCode.toUpperCase() }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Leave the current game
   */
  leaveGame() {
    if (this.socket && this.gameCode) {
      this.socket.emit('game:leave', { gameCode: this.gameCode });
    }
    this.gameCode = null;
    this.playerNumber = null;
    this.isHost = false;
  }

  /**
   * Send a move to the opponent
   * @param {number} column
   * @param {number} row
   * @param {object} gameState - Serialized game state
   */
  sendMove(column, row, gameState) {
    if (!this.socket || !this.gameCode) return;

    this.socket.emit('game:move', {
      gameCode: this.gameCode,
      column,
      row,
      gameState
    });
  }

  /**
   * Request a rematch
   */
  requestRematch() {
    if (!this.socket || !this.gameCode) return;

    this.socket.emit('game:rematch', {
      gameCode: this.gameCode
    });
  }

  /**
   * Check if it's this player's turn
   * @param {number} currentPlayer - Current player number (1 or 2)
   * @returns {boolean}
   */
  isMyTurn(currentPlayer) {
    return this.playerNumber === currentPlayer;
  }

  /**
   * Get opponent's player number
   * @returns {number}
   */
  getOpponentNumber() {
    return this.playerNumber === 1 ? 2 : 1;
  }
}

/**
 * Local multiplayer manager (same device)
 * No networking, just turn management
 */
export class LocalMultiplayer {
  constructor() {
    this.playerNumber = 1;
  }

  isMyTurn() {
    return true; // Always your turn in local mode
  }

  switchPlayer() {
    this.playerNumber = this.playerNumber === 1 ? 2 : 1;
  }

  reset() {
    this.playerNumber = 1;
  }
}

/**
 * Generate a random game code
 * @returns {string}
 */
export function generateGameCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
