const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const confettiCanvas = document.getElementById("confetti-canvas");
const confettiCtx = confettiCanvas.getContext("2d");
const playerScoreEl = document.getElementById("player-score");
const aiScoreEl = document.getElementById("ai-score");
const gameStatusEl = document.getElementById("game-status");
const restartButton = document.getElementById("restart-button");
const pauseButton = document.getElementById("pause-button");
const startButton = document.getElementById("start-button");
const startOverlay = document.getElementById("start-overlay");

const court = {
  width: canvas.width,
  height: canvas.height,
  netWidth: 8,
};

const paddle = {
  width: 18,
  height: 110,
  speed: 7,
  margin: 32,
};

const player = {
  x: paddle.margin,
  y: court.height / 2 - paddle.height / 2,
  width: paddle.width,
  height: paddle.height,
  dy: 0,
  score: 0,
};

const ai = {
  x: court.width - paddle.margin - paddle.width,
  y: court.height / 2 - paddle.height / 2,
  width: paddle.width,
  height: paddle.height,
  score: 0,
  speed: 2.8,
};

const ball = {
  radius: 11,
  x: court.width / 2,
  y: court.height / 2,
  vx: 0,
  vy: 0,
  baseSpeed: 7.2,
  speedIncrement: 0.45,
  rallyAcceleration: 0.0012,
};

const keys = {
  up: false,
  down: false,
};

let gameOver = false;
let gameStarted = false;
let gamePaused = false;
let confettiPieces = [];
let confettiActive = false;

confettiCanvas.width = canvas.width;
confettiCanvas.height = canvas.height;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateStatus(message) {
  gameStatusEl.textContent = message;
}

function launchConfetti() {
  confettiPieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: -20 - Math.random() * confettiCanvas.height * 0.35,
    size: 6 + Math.random() * 6,
    speedY: 2 + Math.random() * 4,
    speedX: -2 + Math.random() * 4,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: -0.2 + Math.random() * 0.4,
    color: ["#ffeb3b", "#ffffff", "#4fc3f7", "#ff8a65", "#81c784"][Math.floor(Math.random() * 5)],
  }));
  confettiActive = true;
}

function clearConfetti() {
  confettiActive = false;
  confettiPieces = [];
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

function resetBall(scoringSide = 0) {
  ball.x = court.width / 2;
  ball.y = court.height / 2;

  const horizontalDirection = scoringSide === 0 ? (Math.random() > 0.5 ? 1 : -1) : scoringSide;
  const verticalDirection = Math.random() > 0.5 ? 1 : -1;
  const angleFactor = 0.55 + Math.random() * 0.55;

  ball.vx = ball.baseSpeed * horizontalDirection;
  ball.vy = ball.baseSpeed * verticalDirection * angleFactor;
}

function resetGame() {
  player.score = 0;
  ai.score = 0;
  gameOver = false;
  gameStarted = true;
  gamePaused = false;
  clearConfetti();
  pauseButton.textContent = "Pause";
  player.y = court.height / 2 - paddle.height / 2;
  ai.y = court.height / 2 - paddle.height / 2;
  updateScoreboard();
  updateStatus("First to 11, win by 2.");
  resetBall(Math.random() > 0.5 ? 1 : -1);
}

function setupOpeningState() {
  player.score = 0;
  ai.score = 0;
  gameOver = false;
  gameStarted = false;
  gamePaused = false;
  clearConfetti();
  pauseButton.textContent = "Pause";
  player.y = court.height / 2 - paddle.height / 2;
  ai.y = court.height / 2 - paddle.height / 2;
  ball.x = court.width / 2;
  ball.y = court.height / 2;
  ball.vx = 0;
  ball.vy = 0;
  updateScoreboard();
  updateStatus("Click Start Game to begin.");
}

function updateScoreboard() {
  playerScoreEl.textContent = player.score;
  aiScoreEl.textContent = ai.score;
}

function handleInput() {
  if (keys.up && !keys.down) {
    player.dy = -paddle.speed;
  } else if (keys.down && !keys.up) {
    player.dy = paddle.speed;
  } else {
    player.dy = 0;
  }
}

function updatePlayer() {
  player.y = clamp(player.y + player.dy, 0, court.height - player.height);
}

function updateAi() {
  const paddleCenter = ai.y + ai.height / 2;
  const target = ball.y;
  const difference = target - paddleCenter;

  if (Math.abs(difference) > 40) {
    ai.y += Math.sign(difference) * ai.speed;
  }

  ai.y = clamp(ai.y, 0, court.height - ai.height);
}

function hasWinner(currentScore, opponentScore) {
  return currentScore >= 11 && currentScore - opponentScore >= 2;
}

function awardPoint(side) {
  if (side === "player") {
    player.score += 1;
  } else {
    ai.score += 1;
  }

  updateScoreboard();

  if (hasWinner(player.score, ai.score)) {
    gameOver = true;
    updateStatus("Player wins! Press Restart Game to play again.");
    launchConfetti();
    ball.vx = 0;
    ball.vy = 0;
    return;
  }

  if (hasWinner(ai.score, player.score)) {
    gameOver = true;
    updateStatus("AI wins! Press Restart Game to play again.");
    clearConfetti();
    ball.vx = 0;
    ball.vy = 0;
    return;
  }

  updateStatus("First to 11, win by 2.");
  resetBall(side === "player" ? -1 : 1);
}

function checkPaddleCollision(currentPaddle, direction) {
  const withinY =
    ball.y + ball.radius >= currentPaddle.y &&
    ball.y - ball.radius <= currentPaddle.y + currentPaddle.height;

  const touchingX =
    direction < 0
      ? ball.x - ball.radius <= currentPaddle.x + currentPaddle.width && ball.x > currentPaddle.x
      : ball.x + ball.radius >= currentPaddle.x && ball.x < currentPaddle.x + currentPaddle.width;

  if (!withinY || !touchingX) {
    return false;
  }

  const impactPoint = (ball.y - (currentPaddle.y + currentPaddle.height / 2)) / (currentPaddle.height / 2);
  const nextSpeed = Math.abs(ball.vx) + ball.speedIncrement;

  ball.vx = nextSpeed * -direction;
  ball.vy = impactPoint * 5.5;

  if (direction < 0) {
    ball.x = currentPaddle.x + currentPaddle.width + ball.radius;
  } else {
    ball.x = currentPaddle.x - ball.radius;
  }

  return true;
}

function updateBall() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (currentSpeed > 0) {
    const acceleratedSpeed = currentSpeed + ball.rallyAcceleration;
    ball.vx = (ball.vx / currentSpeed) * acceleratedSpeed;
    ball.vy = (ball.vy / currentSpeed) * acceleratedSpeed;
  }

  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy *= -1;
  }

  if (ball.y + ball.radius >= court.height) {
    ball.y = court.height - ball.radius;
    ball.vy *= -1;
  }

  if (ball.vx < 0) {
    checkPaddleCollision(player, -1);
  } else {
    checkPaddleCollision(ai, 1);
  }

  if (ball.x + ball.radius < 0) {
    awardPoint("ai");
  }

  if (ball.x - ball.radius > court.width) {
    awardPoint("player");
  }
}

function drawCourt() {
  ctx.clearRect(0, 0, court.width, court.height);

  ctx.fillStyle = "#2f7d59";
  ctx.fillRect(0, 0, court.width, court.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = 4;
  ctx.setLineDash([16, 12]);
  ctx.beginPath();
  ctx.moveTo(court.width / 2, 0);
  ctx.lineTo(court.width / 2, court.height);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fillRect(court.width / 2 - court.netWidth / 2, 0, court.netWidth, court.height);
}

function drawPaddle(currentPaddle) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(currentPaddle.x, currentPaddle.y, currentPaddle.width, currentPaddle.height);
}

function drawBall() {
  ctx.fillStyle = "#ffeb3b";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  if (!confettiActive) {
    return;
  }

  confettiPieces.forEach((piece) => {
    piece.x += piece.speedX;
    piece.y += piece.speedY;
    piece.rotation += piece.rotationSpeed;

    confettiCtx.save();
    confettiCtx.translate(piece.x, piece.y);
    confettiCtx.rotate(piece.rotation);
    confettiCtx.fillStyle = piece.color;
    confettiCtx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.65);
    confettiCtx.restore();
  });

  confettiPieces = confettiPieces.filter((piece) => piece.y < confettiCanvas.height + 20);
  if (confettiPieces.length === 0) {
    confettiActive = false;
  }
}

function render() {
  drawCourt();
  drawPaddle(player);
  drawPaddle(ai);
  drawBall();
  drawConfetti();
}

function gameLoop() {
  if (gameStarted && !gameOver && !gamePaused) {
    handleInput();
    updatePlayer();
    updateAi();
    updateBall();
  }
  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  if (event.key === "w" || event.key === "W" || event.key === "ArrowUp") {
    keys.up = true;
  }

  if (event.key === "s" || event.key === "S" || event.key === "ArrowDown") {
    keys.down = true;
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "w" || event.key === "W" || event.key === "ArrowUp") {
    keys.up = false;
  }

  if (event.key === "s" || event.key === "S" || event.key === "ArrowDown") {
    keys.down = false;
  }
});

restartButton.addEventListener("click", resetGame);
pauseButton.addEventListener("click", () => {
  if (!gameStarted || gameOver) {
    return;
  }

  gamePaused = !gamePaused;
  pauseButton.textContent = gamePaused ? "Resume" : "Pause";
  updateStatus(gamePaused ? "Game paused." : "First to 11, win by 2.");
});
startButton.addEventListener("click", () => {
  startOverlay.classList.add("hidden");
  resetGame();
});

setupOpeningState();
gameLoop();
