/**
 * Four in a Row - Touch & Drag Interactions
 * Mobile-optimized touch handling with spring physics
 */

// Spring physics for drag following
const DRAG_SPRING = {
  stiffness: 0.2,
  damping: 0.85
};

export class TouchController {
  constructor(options) {
    this.boardElement = options.boardElement;
    this.boardGridElement = options.boardGridElement;
    this.floatingPiece = options.floatingPiece;
    this.trayElement = options.trayElement;
    this.columnIndicators = options.columnIndicators;

    this.onColumnSelect = options.onColumnSelect || (() => {});
    this.onDragStart = options.onDragStart || (() => {});
    this.onDragEnd = options.onDragEnd || (() => {});
    this.onColumnHover = options.onColumnHover || (() => {});

    this.isDragging = false;
    this.currentColumn = -1;
    this.touchId = null;
    this.pieceColor = 'red';
    this.enabled = true;

    // Position tracking with spring physics
    this.targetX = 0;
    this.targetY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.animationFrame = null;

    this.init();
  }

  init() {
    // Touch events on tray (for drag)
    this.trayElement.addEventListener('touchstart', this.handleTrayTouchStart.bind(this), { passive: false });

    // Touch events on board (for tap)
    this.boardGridElement.addEventListener('touchstart', this.handleBoardTouchStart.bind(this), { passive: false });
    this.boardGridElement.addEventListener('click', this.handleBoardClick.bind(this));

    // Global touch events for drag
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this));
    document.addEventListener('touchcancel', this.handleTouchEnd.bind(this));

    // Mouse events for desktop testing
    this.trayElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  /**
   * Set the current player's piece color
   * @param {string} color - 'red' or 'yellow'
   */
  setPieceColor(color) {
    this.pieceColor = color;
  }

  /**
   * Enable/disable touch interactions
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.cancelDrag();
    }
  }

  /**
   * Handle touch start on the piece tray
   * @param {TouchEvent} e
   */
  handleTrayTouchStart(e) {
    if (!this.enabled) return;

    const touch = e.touches[0];
    this.touchId = touch.identifier;
    this.startDrag(touch.clientX, touch.clientY);
    e.preventDefault();
  }

  /**
   * Handle touch start on the board (for tap-to-drop)
   * @param {TouchEvent} e
   */
  handleBoardTouchStart(e) {
    if (!this.enabled || this.isDragging) return;

    const touch = e.touches[0];
    const column = this.getColumnFromPosition(touch.clientX, touch.clientY);

    if (column !== -1) {
      // Visual feedback
      this.highlightColumn(column);

      // Short delay to allow for potential drag
      this.tapTimeout = setTimeout(() => {
        if (!this.isDragging) {
          this.onColumnSelect(column);
          this.clearColumnHighlight();
        }
      }, 100);
    }
  }

  /**
   * Handle board click (for desktop)
   * @param {MouseEvent} e
   */
  handleBoardClick(e) {
    if (!this.enabled || this.isDragging) return;

    const column = this.getColumnFromPosition(e.clientX, e.clientY);
    if (column !== -1) {
      this.onColumnSelect(column);
    }
  }

  /**
   * Handle touch move
   * @param {TouchEvent} e
   */
  handleTouchMove(e) {
    if (!this.isDragging) return;

    const touch = Array.from(e.touches).find(t => t.identifier === this.touchId);
    if (!touch) return;

    e.preventDefault();
    this.updateDragPosition(touch.clientX, touch.clientY);
  }

  /**
   * Handle touch end
   * @param {TouchEvent} e
   */
  handleTouchEnd(e) {
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout);
      this.tapTimeout = null;
    }

    if (!this.isDragging) return;

    const touch = Array.from(e.changedTouches).find(t => t.identifier === this.touchId);
    if (!touch) return;

    this.endDrag(touch.clientX, touch.clientY);
  }

  /**
   * Handle mouse down on tray (desktop)
   * @param {MouseEvent} e
   */
  handleMouseDown(e) {
    if (!this.enabled) return;
    this.startDrag(e.clientX, e.clientY);
  }

  /**
   * Handle mouse move (desktop)
   * @param {MouseEvent} e
   */
  handleMouseMove(e) {
    if (!this.isDragging) return;
    this.updateDragPosition(e.clientX, e.clientY);
  }

  /**
   * Handle mouse up (desktop)
   * @param {MouseEvent} e
   */
  handleMouseUp(e) {
    if (!this.isDragging) return;
    this.endDrag(e.clientX, e.clientY);
  }

  /**
   * Start dragging a piece
   * @param {number} x
   * @param {number} y
   */
  startDrag(x, y) {
    this.isDragging = true;
    this.currentX = x;
    this.currentY = y;
    this.targetX = x;
    this.targetY = y;

    // Set up floating piece
    this.floatingPiece.className = `floating-piece ${this.pieceColor}`;
    this.floatingPiece.style.left = `${x}px`;
    this.floatingPiece.style.top = `${y}px`;
    this.floatingPiece.classList.remove('hidden');

    // Start spring animation
    this.startSpringAnimation();

    this.onDragStart();

    // Check initial column
    const column = this.getColumnFromPosition(x, y);
    if (column !== this.currentColumn) {
      this.currentColumn = column;
      this.highlightColumn(column);
      if (column !== -1) {
        this.onColumnHover(column);
      }
    }
  }

  /**
   * Update drag position with spring physics
   * @param {number} x
   * @param {number} y
   */
  updateDragPosition(x, y) {
    this.targetX = x;
    this.targetY = y;

    // Check column change
    const column = this.getColumnFromPosition(x, y);
    if (column !== this.currentColumn) {
      this.currentColumn = column;
      this.highlightColumn(column);
      if (column !== -1) {
        this.onColumnHover(column);
      }
    }
  }

  /**
   * Spring animation loop for smooth following
   */
  startSpringAnimation() {
    const animate = () => {
      if (!this.isDragging) return;

      // Apply spring physics
      const dx = this.targetX - this.currentX;
      const dy = this.targetY - this.currentY;

      this.currentX += dx * DRAG_SPRING.stiffness;
      this.currentY += dy * DRAG_SPRING.stiffness;

      // Update floating piece position
      this.floatingPiece.style.left = `${this.currentX}px`;
      this.floatingPiece.style.top = `${this.currentY}px`;

      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * End dragging
   * @param {number} x
   * @param {number} y
   */
  endDrag(x, y) {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    const column = this.getColumnFromPosition(x, y);

    // Hide floating piece
    this.floatingPiece.classList.add('hidden');

    // Clear highlight
    this.clearColumnHighlight();

    this.isDragging = false;
    this.touchId = null;

    if (column !== -1) {
      this.onColumnSelect(column);
    }

    this.onDragEnd(column);
    this.currentColumn = -1;
  }

  /**
   * Cancel current drag
   */
  cancelDrag() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.floatingPiece.classList.add('hidden');
    this.clearColumnHighlight();
    this.isDragging = false;
    this.touchId = null;
    this.currentColumn = -1;
  }

  /**
   * Get column index from screen position
   * @param {number} x
   * @param {number} y
   * @returns {number} Column index or -1 if outside board
   */
  getColumnFromPosition(x, y) {
    const boardRect = this.boardGridElement.getBoundingClientRect();

    // Check if within horizontal bounds
    if (x < boardRect.left || x > boardRect.right) {
      return -1;
    }

    // Calculate column
    const relativeX = x - boardRect.left;
    const cellWidth = boardRect.width / 7;
    const column = Math.floor(relativeX / cellWidth);

    return Math.max(0, Math.min(6, column));
  }

  /**
   * Highlight a column
   * @param {number} column
   */
  highlightColumn(column) {
    // Clear previous highlights
    this.clearColumnHighlight();

    if (column === -1) return;

    // Highlight column indicator
    const indicator = this.columnIndicators.children[column];
    if (indicator) {
      indicator.classList.add('active');
    }

    // Highlight cells in column
    const cells = this.boardGridElement.querySelectorAll('.cell');
    for (let row = 0; row < 6; row++) {
      const cellIndex = row * 7 + column;
      if (cells[cellIndex]) {
        cells[cellIndex].classList.add('column-hover');
      }
    }
  }

  /**
   * Clear column highlight
   */
  clearColumnHighlight() {
    // Clear indicators
    Array.from(this.columnIndicators.children).forEach(ind => {
      ind.classList.remove('active');
    });

    // Clear cells
    this.boardGridElement.querySelectorAll('.cell.column-hover').forEach(cell => {
      cell.classList.remove('column-hover');
    });
  }

  /**
   * Destroy the controller and remove event listeners
   */
  destroy() {
    this.cancelDrag();
    // Note: In a real app, you'd want to remove all event listeners here
  }
}

/**
 * Haptic feedback helper
 */
export const haptics = {
  enabled: true,

  setEnabled(enabled) {
    this.enabled = enabled;
  },

  /**
   * Light impact feedback
   */
  light() {
    if (!this.enabled) return;

    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium impact feedback
   */
  medium() {
    if (!this.enabled) return;

    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  /**
   * Heavy impact feedback
   */
  heavy() {
    if (!this.enabled) return;

    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },

  /**
   * Selection tick feedback
   */
  selection() {
    if (!this.enabled) return;

    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  },

  /**
   * Success feedback
   */
  success() {
    if (!this.enabled) return;

    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30]);
    }
  },

  /**
   * Error feedback
   */
  error() {
    if (!this.enabled) return;

    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50, 30, 50]);
    }
  },

  /**
   * Warning feedback
   */
  warning() {
    if (!this.enabled) return;

    if ('vibrate' in navigator) {
      navigator.vibrate([30, 20, 30]);
    }
  }
};
