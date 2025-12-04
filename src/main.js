/**
 * Four in a Row - Main Application
 * Wires together all game components
 */

import { GameState, PLAYER_RED, PLAYER_YELLOW, ROWS, COLS, getPlayerColor } from './js/game.js';
import { createDropAnimation, animateBoardImpact, createConfetti, animateWinningPieces, animateInvalidMove } from './js/animations.js';
import { sound } from './js/sound.js';
import { TouchController, haptics } from './js/touch.js';
import { NetworkManager, LocalMultiplayer } from './js/network.js';

class FourInARowApp {
  constructor() {
    // Game state
    this.gameState = new GameState();
    this.gameMode = null; // 'online', 'local', 'join'
    this.isProcessingMove = false;

    // Network
    this.network = null;
    this.localMultiplayer = new LocalMultiplayer();

    // UI Elements
    this.screens = {
      menu: document.getElementById('menu-screen'),
      join: document.getElementById('join-screen'),
      waiting: document.getElementById('waiting-screen'),
      game: document.getElementById('game-screen')
    };

    this.elements = {
      boardGrid: document.getElementById('board-grid'),
      boardContainer: document.getElementById('board-container'),
      floatingPiece: document.getElementById('floating-piece'),
      trayPieces: document.getElementById('tray-pieces'),
      pieceTray: document.getElementById('piece-tray'),
      columnIndicators: document.getElementById('column-indicators'),
      turnIndicator: document.getElementById('turn-indicator'),
      player1Card: document.getElementById('player-1-card'),
      player2Card: document.getElementById('player-2-card'),
      player1Name: document.getElementById('player-1-name'),
      player2Name: document.getElementById('player-2-name'),
      gameCodeText: document.getElementById('game-code-text'),
      gameCodeInput: document.getElementById('game-code-input'),
      joinError: document.getElementById('join-error'),
      resultModal: document.getElementById('result-modal'),
      resultIcon: document.getElementById('result-icon'),
      resultTitle: document.getElementById('result-title'),
      resultMessage: document.getElementById('result-message'),
      confettiContainer: document.getElementById('confetti-container'),
      toastContainer: document.getElementById('toast-container')
    };

    // Touch controller
    this.touchController = null;

    // Settings
    this.settings = {
      sound: true,
      vibration: true
    };

    this.loadSettings();
    this.init();
  }

  /**
   * Initialize the application
   */
  init() {
    this.createBoardGrid();
    this.createColumnIndicators();
    this.createTrayPieces();
    this.setupEventListeners();
    this.setupTouchController();
    this.updateSoundIcons();
  }

  /**
   * Create the board grid cells
   */
  createBoardGrid() {
    this.elements.boardGrid.innerHTML = '';

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        this.elements.boardGrid.appendChild(cell);
      }
    }
  }

  /**
   * Create column indicators
   */
  createColumnIndicators() {
    this.elements.columnIndicators.innerHTML = '';

    for (let col = 0; col < COLS; col++) {
      const indicator = document.createElement('div');
      indicator.className = 'column-indicator';
      indicator.dataset.col = col;
      this.elements.columnIndicators.appendChild(indicator);
    }
  }

  /**
   * Create tray pieces
   */
  createTrayPieces() {
    this.elements.trayPieces.innerHTML = '';

    for (let i = 0; i < 8; i++) {
      const piece = document.createElement('div');
      piece.className = 'tray-piece red';
      this.elements.trayPieces.appendChild(piece);
    }
  }

  /**
   * Update tray pieces to current player color
   */
  updateTrayPieces() {
    const color = getPlayerColor(this.gameState.currentPlayer);
    const pieces = this.elements.trayPieces.querySelectorAll('.tray-piece');
    pieces.forEach(piece => {
      piece.className = `tray-piece ${color}`;
    });
  }

  /**
   * Setup touch controller
   */
  setupTouchController() {
    this.touchController = new TouchController({
      boardElement: this.elements.boardContainer,
      boardGridElement: this.elements.boardGrid,
      floatingPiece: this.elements.floatingPiece,
      trayElement: this.elements.pieceTray,
      columnIndicators: this.elements.columnIndicators,

      onColumnSelect: (col) => this.handleMove(col),
      onDragStart: () => {
        sound.playPiecePickup();
        haptics.light();
      },
      onColumnHover: (col) => {
        sound.playColumnTick();
        haptics.selection();
      },
      onDragEnd: () => {}
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Menu buttons
    document.getElementById('btn-create-game').addEventListener('click', () => this.createOnlineGame());
    document.getElementById('btn-join-game').addEventListener('click', () => this.showScreen('join'));
    document.getElementById('btn-local-game').addEventListener('click', () => this.startLocalGame());

    // Join screen
    document.getElementById('btn-back-join').addEventListener('click', () => this.showScreen('menu'));
    document.getElementById('btn-join-submit').addEventListener('click', () => this.joinOnlineGame());
    this.elements.gameCodeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      document.getElementById('btn-join-submit').disabled = e.target.value.length !== 6;
    });

    // Waiting screen
    document.getElementById('btn-back-waiting').addEventListener('click', () => this.cancelWaiting());
    document.getElementById('btn-cancel-waiting').addEventListener('click', () => this.cancelWaiting());
    document.getElementById('btn-copy-code').addEventListener('click', () => this.copyGameCode());

    // Game screen
    document.getElementById('btn-leave-game').addEventListener('click', () => this.leaveGame());
    document.getElementById('btn-new-game-ingame').addEventListener('click', () => this.requestRematch());

    // Result modal
    document.getElementById('btn-play-again').addEventListener('click', () => this.handlePlayAgain());
    document.getElementById('btn-main-menu').addEventListener('click', () => this.returnToMenu());

    // Settings
    document.getElementById('btn-settings').addEventListener('click', () => this.showModal('settings-modal'));
    document.getElementById('btn-close-settings').addEventListener('click', () => this.hideModal('settings-modal'));
    document.getElementById('setting-sound').addEventListener('change', (e) => this.toggleSound(e.target.checked));
    document.getElementById('setting-vibration').addEventListener('change', (e) => this.toggleVibration(e.target.checked));

    // Help
    document.getElementById('btn-help').addEventListener('click', () => this.showModal('help-modal'));
    document.getElementById('btn-close-help').addEventListener('click', () => this.hideModal('help-modal'));

    // Sound toggles
    document.getElementById('btn-sound-toggle').addEventListener('click', () => this.toggleSound());
    document.getElementById('btn-game-sound').addEventListener('click', () => this.toggleSound());

    // Modal backdrops
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal && modal.id !== 'result-modal') {
          this.hideModal(modal.id);
        }
      });
    });

    // Initialize sound on first interaction
    document.addEventListener('click', () => this.initSound(), { once: true });
    document.addEventListener('touchstart', () => this.initSound(), { once: true });
  }

  /**
   * Initialize sound system
   */
  async initSound() {
    await sound.init();
    sound.setEnabled(this.settings.sound);
  }

  /**
   * Show a screen
   * @param {string} screenName
   */
  showScreen(screenName) {
    // Hide all screens
    Object.values(this.screens).forEach(screen => {
      screen.classList.remove('active');
      screen.classList.add('exiting');
    });

    // Show target screen after brief delay
    setTimeout(() => {
      Object.values(this.screens).forEach(screen => {
        screen.classList.remove('exiting');
      });
      this.screens[screenName].classList.add('active');
    }, 150);
  }

  /**
   * Show a modal
   * @param {string} modalId
   */
  showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
    sound.playButtonPress();
  }

  /**
   * Hide a modal
   * @param {string} modalId
   */
  hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  }

  /**
   * Show toast notification
   * @param {string} message
   * @param {string} type - 'info', 'success', 'error'
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /**
   * Start a local 2-player game
   */
  startLocalGame() {
    this.gameMode = 'local';
    this.localMultiplayer.reset();
    this.resetGame();

    this.elements.player1Name.textContent = 'Player 1';
    this.elements.player2Name.textContent = 'Player 2';

    this.showScreen('game');
    this.updateUI();

    sound.playButtonPress();
    haptics.medium();
  }

  /**
   * Create an online game
   */
  async createOnlineGame() {
    sound.playButtonPress();
    haptics.medium();

    this.gameMode = 'online';

    try {
      await this.connectToServer();
      const gameCode = await this.network.createGame();

      // Set the game code from the returned value
      this.network.gameCode = gameCode;
      this.elements.gameCodeText.textContent = gameCode;
      this.showScreen('waiting');

    } catch (error) {
      console.error('Failed to create game:', error);
      this.showToast('Failed to connect to server', 'error');
      this.gameMode = null;
    }
  }

  /**
   * Join an online game
   */
  async joinOnlineGame() {
    const gameCode = this.elements.gameCodeInput.value.toUpperCase();

    if (gameCode.length !== 6) {
      this.elements.joinError.textContent = 'Please enter a 6-character code';
      this.elements.joinError.classList.remove('hidden');
      return;
    }

    sound.playButtonPress();
    haptics.medium();

    this.gameMode = 'join';

    try {
      await this.connectToServer();
      await this.network.joinGame(gameCode);

      // Will be redirected to game screen via onGameJoined callback

    } catch (error) {
      console.error('Failed to join game:', error);
      this.elements.joinError.textContent = error.message || 'Failed to join game';
      this.elements.joinError.classList.remove('hidden');
      haptics.error();
    }
  }

  /**
   * Connect to the game server
   */
  async connectToServer() {
    if (this.network && this.network.connected) {
      return;
    }

    this.network = new NetworkManager({
      onConnected: () => {
        console.log('Connected to server');
      },
      onDisconnected: (reason) => {
        console.log('Disconnected:', reason);
        if (this.gameMode === 'online' || this.gameMode === 'join') {
          this.showToast('Disconnected from server', 'error');
        }
      },
      onGameCreated: (data) => {
        console.log('Game created:', data.gameCode);
      },
      onGameJoined: (data) => {
        console.log('Joined game:', data);
        this.startOnlineGame(data);
      },
      onOpponentJoined: (data) => {
        console.log('Opponent joined');
        sound.playPlayerJoin();
        haptics.success();
        this.showToast('Opponent joined!', 'success');
        this.startOnlineGame(data);
      },
      onOpponentLeft: (data) => {
        console.log('Opponent left');
        sound.playPlayerLeave();
        haptics.warning();
        this.showToast('Opponent left the game', 'error');
      },
      onOpponentMove: (data) => {
        this.handleOpponentMove(data);
      },
      onGameState: (data) => {
        this.syncGameState(data);
      },
      onRematch: (data) => {
        this.handleRematch(data);
      },
      onError: (data) => {
        console.error('Game error:', data);
        this.showToast(data.message || 'An error occurred', 'error');
      }
    });

    await this.network.connect();
  }

  /**
   * Start an online game
   * @param {object} data
   */
  startOnlineGame(data) {
    this.resetGame();

    const isHost = this.network.playerNumber === 1;
    this.elements.player1Name.textContent = isHost ? 'You' : 'Opponent';
    this.elements.player2Name.textContent = isHost ? 'Opponent' : 'You';

    this.showScreen('game');
    this.updateUI();
  }

  /**
   * Cancel waiting for opponent
   */
  cancelWaiting() {
    if (this.network) {
      this.network.leaveGame();
    }
    this.gameMode = null;
    this.showScreen('menu');
  }

  /**
   * Copy game code to clipboard
   */
  async copyGameCode() {
    const code = this.elements.gameCodeText.textContent;

    try {
      await navigator.clipboard.writeText(code);
      this.showToast('Code copied!', 'success');
      haptics.success();
    } catch (e) {
      // Fallback
      this.showToast(code, 'info');
    }
  }

  /**
   * Leave the current game
   */
  leaveGame() {
    sound.playButtonPress();

    if (this.network) {
      this.network.leaveGame();
    }

    this.gameMode = null;
    this.showScreen('menu');
  }

  /**
   * Reset game state
   */
  resetGame() {
    this.gameState.reset();
    this.isProcessingMove = false;
    this.renderBoard();
    this.updateTrayPieces();
    this.touchController.setPieceColor('red');
    this.touchController.setEnabled(true);
    this.hideModal('result-modal');
  }

  /**
   * Handle a move
   * @param {number} col
   */
  async handleMove(col) {
    // Prevent multiple moves
    if (this.isProcessingMove || this.gameState.gameOver) return;

    // Check if it's this player's turn (for online mode)
    if (this.gameMode === 'online' || this.gameMode === 'join') {
      if (!this.network.isMyTurn(this.gameState.currentPlayer)) {
        sound.playInvalidMove();
        haptics.error();
        animateInvalidMove(this.elements.boardContainer);
        return;
      }
    }

    // Try to make the move
    const result = this.gameState.makeMove(col);

    if (!result.success) {
      sound.playInvalidMove();
      haptics.error();
      animateInvalidMove(this.elements.boardContainer);
      return;
    }

    this.isProcessingMove = true;
    this.touchController.setEnabled(false);

    // Animate the piece drop
    await this.animateDrop(col, result.row, getPlayerColor(
      this.gameState.currentPlayer === PLAYER_RED ? PLAYER_YELLOW : PLAYER_RED
    ));

    // Send move to opponent (online mode)
    if (this.gameMode === 'online' || this.gameMode === 'join') {
      this.network.sendMove(col, result.row, this.gameState.serialize());
    }

    // Handle game end
    if (result.winner) {
      await this.handleWin(result.winner, result.winningCells);
    } else if (result.isDraw) {
      await this.handleDraw();
    } else {
      // Continue game
      this.updateUI();
      this.updateTrayPieces();
      this.touchController.setPieceColor(getPlayerColor(this.gameState.currentPlayer));

      // Enable input for next player
      if (this.gameMode === 'local') {
        this.touchController.setEnabled(true);
      } else if (this.network.isMyTurn(this.gameState.currentPlayer)) {
        this.touchController.setEnabled(true);
        sound.playYourTurn();
      }
    }

    this.isProcessingMove = false;
  }

  /**
   * Handle opponent's move (online mode)
   * @param {object} data
   */
  async handleOpponentMove(data) {
    if (this.isProcessingMove) return;

    this.isProcessingMove = true;
    this.touchController.setEnabled(false);

    // Apply the move to game state
    const result = this.gameState.makeMove(data.column);

    if (result.success) {
      // Animate opponent's piece
      await this.animateDrop(data.column, data.row, getPlayerColor(
        this.gameState.currentPlayer === PLAYER_RED ? PLAYER_YELLOW : PLAYER_RED
      ));

      // Handle game end
      if (result.winner) {
        await this.handleWin(result.winner, result.winningCells);
      } else if (result.isDraw) {
        await this.handleDraw();
      } else {
        this.updateUI();
        this.updateTrayPieces();
        this.touchController.setPieceColor(getPlayerColor(this.gameState.currentPlayer));

        // It's now this player's turn
        if (this.network.isMyTurn(this.gameState.currentPlayer)) {
          sound.playYourTurn();
          this.touchController.setEnabled(true);
        }
      }
    }

    this.isProcessingMove = false;
  }

  /**
   * Animate piece drop
   * @param {number} col
   * @param {number} row
   * @param {string} color
   */
  async animateDrop(col, row, color) {
    const cell = this.elements.boardGrid.querySelector(
      `.cell[data-row="${row}"][data-col="${col}"]`
    );

    if (!cell) return;

    // Create piece element
    const piece = document.createElement('div');
    piece.className = `piece ${color}`;
    cell.appendChild(piece);

    // Get cell height for physics calculation
    const cellHeight = cell.offsetHeight;

    // Play drop animation
    const { duration } = await createDropAnimation(piece, row, cellHeight);

    // Board shake on impact
    animateBoardImpact(this.elements.boardContainer, Math.min(row / 5, 1));

    // Play impact sound (after initial fall)
    const fallTime = Math.sqrt(2 * (row + 1.5) * cellHeight / 2800) * 1000;
    setTimeout(() => {
      sound.playPieceImpact(row + 1);
      haptics.medium();
    }, fallTime * 0.95);
  }

  /**
   * Handle win
   * @param {number} winner
   * @param {array} winningCells
   */
  async handleWin(winner, winningCells) {
    // Animate winning pieces
    const winningPieces = winningCells.map(({ row, col }) => {
      const cell = this.elements.boardGrid.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
      );
      return cell?.querySelector('.piece');
    }).filter(Boolean);

    animateWinningPieces(winningPieces);

    // Determine if this player won
    let isWinner = false;
    if (this.gameMode === 'local') {
      // In local mode, just show who won
      isWinner = true;
    } else {
      isWinner = this.network.playerNumber === winner;
    }

    // Play appropriate sound
    if (isWinner) {
      sound.playWin();
      haptics.success();
    } else {
      sound.playLose();
      haptics.warning();
    }

    // Wait a moment before showing modal
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Show result modal
    this.showResultModal(
      isWinner ? 'win' : 'lose',
      this.gameMode === 'local'
        ? `${getPlayerColor(winner).charAt(0).toUpperCase() + getPlayerColor(winner).slice(1)} wins!`
        : (isWinner ? 'You Win!' : 'You Lose'),
      this.gameMode === 'local'
        ? 'Great game!'
        : (isWinner ? 'Congratulations!' : 'Better luck next time!')
    );
  }

  /**
   * Handle draw
   */
  async handleDraw() {
    sound.playDraw();
    haptics.warning();

    await new Promise(resolve => setTimeout(resolve, 500));

    this.showResultModal(
      'draw',
      "It's a Draw!",
      'The board is full with no winner.'
    );
  }

  /**
   * Show result modal
   * @param {string} type - 'win', 'lose', 'draw'
   * @param {string} title
   * @param {string} message
   */
  showResultModal(type, title, message) {
    const icons = {
      win: '🏆',
      lose: '😔',
      draw: '🤝'
    };

    this.elements.resultIcon.textContent = icons[type];
    this.elements.resultTitle.textContent = title;
    this.elements.resultTitle.className = `result-title ${type}`;
    this.elements.resultMessage.textContent = message;

    // Create confetti for win
    if (type === 'win') {
      createConfetti(this.elements.confettiContainer, 40);
    }

    this.showModal('result-modal');
  }

  /**
   * Handle play again button
   */
  handlePlayAgain() {
    sound.playButtonPress();
    haptics.medium();

    if (this.gameMode === 'online' || this.gameMode === 'join') {
      // Request rematch
      this.network.requestRematch();
      this.showToast('Rematch requested', 'info');
    } else {
      // Local game - just reset
      this.resetGame();
      this.updateUI();
    }

    this.hideModal('result-modal');
  }

  /**
   * Request rematch (online mode)
   */
  requestRematch() {
    if (this.network) {
      this.network.requestRematch();
      this.showToast('Rematch requested', 'info');
    }
  }

  /**
   * Handle rematch from server
   */
  handleRematch(data) {
    this.resetGame();
    this.updateUI();
    sound.playPlayerJoin();
    haptics.success();
    this.showToast('Rematch started!', 'success');
  }

  /**
   * Sync game state from server
   */
  syncGameState(data) {
    if (data.gameState) {
      this.gameState.deserialize(data.gameState);
      this.renderBoard();
      this.updateUI();
    }
  }

  /**
   * Return to main menu
   */
  returnToMenu() {
    sound.playButtonPress();

    if (this.network) {
      this.network.leaveGame();
    }

    this.gameMode = null;
    this.hideModal('result-modal');
    this.showScreen('menu');
  }

  /**
   * Render the board from game state
   */
  renderBoard() {
    const cells = this.elements.boardGrid.querySelectorAll('.cell');

    cells.forEach(cell => {
      const row = parseInt(cell.dataset.row);
      const col = parseInt(cell.dataset.col);
      const value = this.gameState.board[row][col];

      // Clear existing piece
      cell.innerHTML = '';

      // Add piece if occupied
      if (value !== 0) {
        const piece = document.createElement('div');
        piece.className = `piece ${getPlayerColor(value)}`;
        cell.appendChild(piece);
      }
    });
  }

  /**
   * Update UI elements
   */
  updateUI() {
    const currentColor = getPlayerColor(this.gameState.currentPlayer);

    // Update turn indicator
    const turnIndicator = this.elements.turnIndicator;
    turnIndicator.className = `turn-indicator ${currentColor}`;

    const turnText = turnIndicator.querySelector('.turn-text');
    const thinkingDots = turnIndicator.querySelector('.thinking-dots');

    if (this.gameMode === 'local') {
      turnText.textContent = `${currentColor.charAt(0).toUpperCase() + currentColor.slice(1)}'s Turn`;
      thinkingDots.classList.add('hidden');
    } else if (this.network) {
      const isMyTurn = this.network.isMyTurn(this.gameState.currentPlayer);
      turnText.textContent = isMyTurn ? 'Your Turn' : "Opponent's Turn";

      if (isMyTurn) {
        thinkingDots.classList.add('hidden');
      } else {
        thinkingDots.classList.remove('hidden');
      }
    }

    // Update player cards
    this.elements.player1Card.classList.toggle('active', this.gameState.currentPlayer === PLAYER_RED);
    this.elements.player2Card.classList.toggle('active', this.gameState.currentPlayer === PLAYER_YELLOW);
  }

  /**
   * Toggle sound on/off
   * @param {boolean} enabled
   */
  toggleSound(enabled) {
    if (typeof enabled === 'undefined') {
      enabled = !this.settings.sound;
    }

    this.settings.sound = enabled;
    sound.setEnabled(enabled);
    this.saveSettings();
    this.updateSoundIcons();

    // Update checkbox if it exists
    const checkbox = document.getElementById('setting-sound');
    if (checkbox) {
      checkbox.checked = enabled;
    }
  }

  /**
   * Toggle vibration on/off
   * @param {boolean} enabled
   */
  toggleVibration(enabled) {
    this.settings.vibration = enabled;
    haptics.setEnabled(enabled);
    this.saveSettings();
  }

  /**
   * Update sound icons
   */
  updateSoundIcons() {
    const soundOn = this.settings.sound;

    document.querySelectorAll('.icon-sound-on').forEach(icon => {
      icon.classList.toggle('hidden', !soundOn);
    });

    document.querySelectorAll('.icon-sound-off').forEach(icon => {
      icon.classList.toggle('hidden', soundOn);
    });
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('four-in-a-row-settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }

    // Apply settings
    sound.setEnabled(this.settings.sound);
    haptics.setEnabled(this.settings.vibration);

    // Update checkboxes
    const soundCheckbox = document.getElementById('setting-sound');
    const vibrationCheckbox = document.getElementById('setting-vibration');

    if (soundCheckbox) soundCheckbox.checked = this.settings.sound;
    if (vibrationCheckbox) vibrationCheckbox.checked = this.settings.vibration;
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('four-in-a-row-settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new FourInARowApp();
});
