/**
 * Four in a Row - Multiplayer Server
 * Socket.IO based real-time game server
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static files from dist in production
app.use(express.static(join(__dirname, '../dist')));

// Game rooms storage
const games = new Map();

/**
 * Generate a random game code
 * @returns {string}
 */
function generateGameCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;

  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (games.has(code)); // Ensure unique

  return code;
}

/**
 * Create a new game room
 * @param {string} hostId - Socket ID of the host
 * @returns {object} Game object
 */
function createGame(hostId) {
  const code = generateGameCode();

  const game = {
    code,
    hostId,
    players: [hostId],
    gameState: null,
    currentPlayer: 1,
    createdAt: Date.now(),
    rematchRequests: new Set()
  };

  games.set(code, game);
  return game;
}

/**
 * Get a game by code
 * @param {string} code
 * @returns {object|null}
 */
function getGame(code) {
  return games.get(code) || null;
}

/**
 * Delete a game
 * @param {string} code
 */
function deleteGame(code) {
  games.delete(code);
}

/**
 * Clean up old games (older than 1 hour)
 */
function cleanupOldGames() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  for (const [code, game] of games.entries()) {
    if (game.createdAt < oneHourAgo) {
      deleteGame(code);
      console.log(`Cleaned up old game: ${code}`);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupOldGames, 10 * 60 * 1000);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Store player's current game
  let currentGameCode = null;

  /**
   * Create a new game
   */
  socket.on('game:create', (data, callback) => {
    try {
      const game = createGame(socket.id);
      currentGameCode = game.code;

      socket.join(game.code);

      callback({ success: true, gameCode: game.code });

      socket.emit('game:created', {
        gameCode: game.code,
        playerNumber: 1
      });

      console.log(`Game created: ${game.code} by ${socket.id}`);

    } catch (error) {
      console.error('Error creating game:', error);
      callback({ error: 'Failed to create game' });
    }
  });

  /**
   * Join an existing game
   */
  socket.on('game:join', (data, callback) => {
    try {
      const { gameCode } = data;
      const game = getGame(gameCode);

      if (!game) {
        callback({ error: 'Game not found' });
        return;
      }

      if (game.players.length >= 2) {
        callback({ error: 'Game is full' });
        return;
      }

      // Add player to game
      game.players.push(socket.id);
      currentGameCode = gameCode;

      socket.join(gameCode);

      callback({ success: true, gameCode, playerNumber: 2 });

      // Notify the joining player
      socket.emit('game:joined', {
        gameCode,
        playerNumber: 2
      });

      // Notify the host that opponent joined
      socket.to(gameCode).emit('game:opponent-joined', {
        playerId: socket.id
      });

      console.log(`Player ${socket.id} joined game ${gameCode}`);

    } catch (error) {
      console.error('Error joining game:', error);
      callback({ error: 'Failed to join game' });
    }
  });

  /**
   * Leave a game
   */
  socket.on('game:leave', (data) => {
    const { gameCode } = data;
    leaveGame(socket, gameCode);
  });

  /**
   * Handle a move
   */
  socket.on('game:move', (data) => {
    const { gameCode, column, row, gameState } = data;
    const game = getGame(gameCode);

    if (!game) return;

    // Update game state
    game.gameState = gameState;

    // Broadcast move to opponent
    socket.to(gameCode).emit('game:move', {
      column,
      row,
      gameState
    });

    console.log(`Move in ${gameCode}: column ${column}, row ${row}`);
  });

  /**
   * Handle rematch request
   */
  socket.on('game:rematch', (data) => {
    const { gameCode } = data;
    const game = getGame(gameCode);

    if (!game) return;

    game.rematchRequests.add(socket.id);

    // If both players requested rematch
    if (game.rematchRequests.size >= 2) {
      // Reset game state
      game.gameState = null;
      game.currentPlayer = 1;
      game.rematchRequests.clear();

      // Notify both players
      io.to(gameCode).emit('game:rematch', {
        gameState: null
      });

      console.log(`Rematch started in ${gameCode}`);
    } else {
      // Notify opponent of rematch request
      socket.to(gameCode).emit('game:rematch-requested', {
        playerId: socket.id
      });
    }
  });

  /**
   * Handle disconnect
   */
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    if (currentGameCode) {
      leaveGame(socket, currentGameCode);
    }
  });

  /**
   * Helper function to leave a game
   */
  function leaveGame(socket, gameCode) {
    const game = getGame(gameCode);

    if (!game) return;

    // Remove player from game
    game.players = game.players.filter(id => id !== socket.id);

    socket.leave(gameCode);

    // Notify other player
    socket.to(gameCode).emit('game:opponent-left', {
      playerId: socket.id
    });

    // Delete game if empty
    if (game.players.length === 0) {
      deleteGame(gameCode);
      console.log(`Game deleted: ${gameCode}`);
    }

    console.log(`Player ${socket.id} left game ${gameCode}`);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    games: games.size,
    uptime: process.uptime()
  });
});

// Start server
const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Four in a Row server running on 0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
