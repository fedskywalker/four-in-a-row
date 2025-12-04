/**
 * Four in a Row - Physics-Based Animations
 * Realistic piece drop with gravity, bouncing, and settle effects
 */

// Physics constants
const PHYSICS = {
  gravity: 2800,           // pixels/s² (scaled for visual effect)
  bounceDamping: 0.35,     // Energy retained per bounce (35%)
  bounceThreshold: 2,      // Minimum bounce height in pixels
  airResistance: 0.995,    // Slight air drag
};

/**
 * Calculates drop animation keyframes with physics-based bouncing
 * @param {number} startY - Starting Y position (negative, above board)
 * @param {number} endY - Final resting Y position
 * @param {number} cellHeight - Height of one cell
 * @returns {{keyframes: Keyframe[], duration: number}}
 */
export function calculateDropAnimation(startY, endY, cellHeight) {
  const dropDistance = endY - startY;

  // Calculate fall duration using physics: t = sqrt(2d/g)
  const fallDuration = Math.sqrt(2 * dropDistance / PHYSICS.gravity) * 1000;

  // Calculate bounces
  const bounces = [];
  let bounceHeight = dropDistance * PHYSICS.bounceDamping * 0.4;
  let totalBounceTime = 0;

  while (bounceHeight > PHYSICS.bounceThreshold) {
    const bounceDuration = Math.sqrt(2 * bounceHeight / PHYSICS.gravity) * 1000 * 2;
    bounces.push({
      height: bounceHeight,
      duration: bounceDuration
    });
    totalBounceTime += bounceDuration;
    bounceHeight *= PHYSICS.bounceDamping;
  }

  // Add final settle
  const settleDuration = 80;

  const totalDuration = fallDuration + totalBounceTime + settleDuration;

  // Build keyframes
  const keyframes = [];
  let currentTime = 0;

  // Initial position
  keyframes.push({
    offset: 0,
    transform: `translateY(${startY}px)`,
    easing: 'cubic-bezier(0.55, 0, 1, 0.45)' // Accelerating fall
  });

  // First impact
  currentTime = fallDuration;
  keyframes.push({
    offset: currentTime / totalDuration,
    transform: `translateY(${endY}px)`,
    easing: 'cubic-bezier(0, 0.55, 0.45, 1)' // Decelerate up
  });

  // Bounces
  for (const bounce of bounces) {
    // Peak of bounce
    currentTime += bounce.duration / 2;
    const peakY = endY - bounce.height;
    keyframes.push({
      offset: currentTime / totalDuration,
      transform: `translateY(${peakY}px)`,
      easing: 'cubic-bezier(0.55, 0, 1, 0.45)' // Accelerate down
    });

    // Impact
    currentTime += bounce.duration / 2;
    keyframes.push({
      offset: currentTime / totalDuration,
      transform: `translateY(${endY}px)`,
      easing: 'cubic-bezier(0, 0.55, 0.45, 1)'
    });
  }

  // Final settle (tiny lift and rest)
  const settleHeight = 2;
  keyframes.push({
    offset: (currentTime + settleDuration * 0.5) / totalDuration,
    transform: `translateY(${endY - settleHeight}px)`,
    easing: 'ease-out'
  });

  keyframes.push({
    offset: 1,
    transform: `translateY(${endY}px)`,
    easing: 'ease-out'
  });

  return { keyframes, duration: totalDuration };
}

/**
 * Creates a CSS animation for piece drop
 * @param {HTMLElement} piece - The piece element
 * @param {number} targetRow - Target row (0 = top, 5 = bottom)
 * @param {number} cellHeight - Height of one cell
 * @param {number} boardTop - Top position of the board
 * @returns {Promise<void>}
 */
export function animatePieceDrop(piece, targetRow, cellHeight, boardTop) {
  return new Promise((resolve) => {
    // Calculate positions
    const startY = -cellHeight - 10; // Start above the board
    const endY = 0; // Relative to final position

    // Calculate total drop distance (in cell units for physics)
    const dropCells = targetRow + 1.5; // +1.5 accounts for starting above
    const dropDistance = dropCells * cellHeight;

    const { keyframes, duration } = calculateDropAnimation(-dropDistance, 0, cellHeight);

    // Apply animation
    const animation = piece.animate(keyframes, {
      duration: duration,
      easing: 'linear',
      fill: 'forwards'
    });

    animation.onfinish = () => {
      piece.style.transform = 'translate(-50%, -50%)';
      resolve();
    };
  });
}

/**
 * Simplified drop animation using CSS
 * @param {number} targetRow - Row index (0 = top)
 * @param {number} cellHeight - Height of one cell
 * @returns {string} CSS animation name
 */
export function getDropAnimationCSS(targetRow, cellHeight) {
  const dropDistance = (targetRow + 1.5) * cellHeight;
  const fallDuration = Math.sqrt(2 * dropDistance / PHYSICS.gravity) * 1000;

  // Calculate bounce parameters
  const bounce1Height = dropDistance * PHYSICS.bounceDamping * 0.4;
  const bounce1Duration = Math.sqrt(2 * bounce1Height / PHYSICS.gravity) * 1000 * 2;

  const bounce2Height = bounce1Height * PHYSICS.bounceDamping;
  const bounce2Duration = Math.sqrt(2 * bounce2Height / PHYSICS.gravity) * 1000 * 2;

  const bounce3Height = bounce2Height * PHYSICS.bounceDamping;
  const bounce3Duration = Math.sqrt(2 * bounce3Height / PHYSICS.gravity) * 1000 * 2;

  const settleDuration = 80;

  const totalDuration = fallDuration + bounce1Duration + bounce2Duration + bounce3Duration + settleDuration;

  // Calculate keyframe percentages
  const p1 = (fallDuration / totalDuration) * 100;
  const p2 = ((fallDuration + bounce1Duration / 2) / totalDuration) * 100;
  const p3 = ((fallDuration + bounce1Duration) / totalDuration) * 100;
  const p4 = ((fallDuration + bounce1Duration + bounce2Duration / 2) / totalDuration) * 100;
  const p5 = ((fallDuration + bounce1Duration + bounce2Duration) / totalDuration) * 100;
  const p6 = ((fallDuration + bounce1Duration + bounce2Duration + bounce3Duration / 2) / totalDuration) * 100;
  const p7 = ((fallDuration + bounce1Duration + bounce2Duration + bounce3Duration) / totalDuration) * 100;
  const p8 = ((totalDuration - settleDuration / 2) / totalDuration) * 100;

  return {
    duration: totalDuration,
    keyframes: `
      0% {
        transform: translate(-50%, calc(-50% - ${dropDistance}px));
        animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
      }
      ${p1.toFixed(1)}% {
        transform: translate(-50%, -50%);
        animation-timing-function: cubic-bezier(0, 0.55, 0.45, 1);
      }
      ${p2.toFixed(1)}% {
        transform: translate(-50%, calc(-50% - ${bounce1Height.toFixed(1)}px));
        animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
      }
      ${p3.toFixed(1)}% {
        transform: translate(-50%, -50%);
        animation-timing-function: cubic-bezier(0, 0.55, 0.45, 1);
      }
      ${p4.toFixed(1)}% {
        transform: translate(-50%, calc(-50% - ${bounce2Height.toFixed(1)}px));
        animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
      }
      ${p5.toFixed(1)}% {
        transform: translate(-50%, -50%);
        animation-timing-function: cubic-bezier(0, 0.55, 0.45, 1);
      }
      ${p6.toFixed(1)}% {
        transform: translate(-50%, calc(-50% - ${bounce3Height.toFixed(1)}px));
        animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
      }
      ${p7.toFixed(1)}% {
        transform: translate(-50%, -50%);
        animation-timing-function: ease-out;
      }
      ${p8.toFixed(1)}% {
        transform: translate(-50%, calc(-50% - 2px));
        animation-timing-function: ease-out;
      }
      100% {
        transform: translate(-50%, -50%);
      }
    `
  };
}

/**
 * Creates dynamic keyframe animation and applies it
 * @param {HTMLElement} piece - Piece element
 * @param {number} targetRow - Target row
 * @param {number} cellHeight - Cell height
 * @returns {Promise<{duration: number}>}
 */
export function createDropAnimation(piece, targetRow, cellHeight) {
  return new Promise((resolve) => {
    const animData = getDropAnimationCSS(targetRow, cellHeight);

    // Create unique animation name
    const animName = `drop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create and inject keyframes
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes ${animName} {
        ${animData.keyframes}
      }
    `;
    document.head.appendChild(styleSheet);

    // Apply animation
    piece.style.animation = `${animName} ${animData.duration}ms linear forwards`;
    piece.classList.add('dropping');

    // Cleanup after animation
    const cleanup = () => {
      piece.classList.remove('dropping');
      piece.style.animation = '';
      piece.style.transform = 'translate(-50%, -50%)';
      styleSheet.remove();
      resolve({ duration: animData.duration });
    };

    piece.addEventListener('animationend', cleanup, { once: true });

    // Fallback timeout
    setTimeout(cleanup, animData.duration + 100);
  });
}

/**
 * Animates the board shake on piece impact
 * @param {HTMLElement} boardContainer
 * @param {number} intensity - Shake intensity (0-1)
 */
export function animateBoardImpact(boardContainer, intensity = 1) {
  boardContainer.classList.remove('impact');
  // Trigger reflow
  void boardContainer.offsetWidth;
  boardContainer.classList.add('impact');

  setTimeout(() => {
    boardContainer.classList.remove('impact');
  }, 300);
}

/**
 * Creates confetti particles for win celebration
 * @param {HTMLElement} container
 * @param {number} count - Number of particles
 */
export function createConfetti(container, count = 30) {
  const colors = ['#ff6b6b', '#fdd835', '#4caf50', '#2196f3', '#9c27b0', '#ff9800'];
  const containerRect = container.getBoundingClientRect();

  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';

    // Random properties
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 500;
    const duration = 2000 + Math.random() * 1000;
    const rotation = Math.random() * 360;
    const size = 6 + Math.random() * 8;

    confetti.style.cssText = `
      left: ${left}%;
      top: -20px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      animation-delay: ${delay}ms;
      animation-duration: ${duration}ms;
      transform: rotate(${rotation}deg);
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;

    container.appendChild(confetti);

    // Remove after animation
    setTimeout(() => {
      confetti.remove();
    }, delay + duration + 100);
  }
}

/**
 * Piece pickup animation
 * @param {HTMLElement} piece
 * @returns {Animation}
 */
export function animatePiecePickup(piece) {
  return piece.animate([
    { transform: 'scale(1) translateY(0)', boxShadow: '0 4px 8px rgba(0,0,0,0.4)' },
    { transform: 'scale(1.15) translateY(-8px)', boxShadow: '0 12px 24px rgba(0,0,0,0.5)' }
  ], {
    duration: 150,
    easing: 'ease-out',
    fill: 'forwards'
  });
}

/**
 * Piece return to tray animation
 * @param {HTMLElement} piece
 * @param {number} startX
 * @param {number} startY
 * @param {number} endX
 * @param {number} endY
 * @returns {Promise<void>}
 */
export function animatePieceReturn(piece, startX, startY, endX, endY) {
  return new Promise((resolve) => {
    const animation = piece.animate([
      { transform: `translate(${startX}px, ${startY}px) scale(1.15)`, opacity: 1 },
      { transform: `translate(${endX}px, ${endY}px) scale(1)`, opacity: 0 }
    ], {
      duration: 300,
      easing: 'ease-in-out',
      fill: 'forwards'
    });

    animation.onfinish = resolve;
  });
}

/**
 * Invalid move shake animation
 * @param {HTMLElement} element
 */
export function animateInvalidMove(element) {
  element.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-8px)' },
    { transform: 'translateX(8px)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(4px)' },
    { transform: 'translateX(0)' }
  ], {
    duration: 400,
    easing: 'ease-out'
  });
}

/**
 * Winning pieces pulse animation
 * @param {HTMLElement[]} pieces
 */
export function animateWinningPieces(pieces) {
  pieces.forEach((piece, index) => {
    setTimeout(() => {
      piece.classList.add('winning');
    }, index * 100);
  });
}
