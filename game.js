const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const speedEl = document.getElementById("speed");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const box = 20;
const cols = canvas.width / box;
const rows = canvas.height / box;

let snake;
let direction;
let nextDirection;
let food;
let enemies;
let score;
let level;
let speed;
let gameLoop;
let isPaused;
let isGameOver;

function initGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];

  direction = "RIGHT";
  nextDirection = "RIGHT";
  food = randomFreePosition();
  enemies = [];
  score = 0;
  level = 1;
  speed = 160;
  isPaused = false;
  isGameOver = false;

  updateHud();
  restartLoop();
  drawGame();
}

function restartLoop() {
  clearInterval(gameLoop);
  gameLoop = setInterval(updateGame, speed);
}

function updateGame() {
  if (isPaused || isGameOver) return;

  direction = nextDirection;
  moveSnake();
  checkFoodCollision();
  checkEnemyCollision();
  checkSelfCollision();
  updateLevel();
  spawnEnemies();
  moveEnemies();
  drawGame();
}

function moveSnake() {
  const head = { ...snake[0] };

  if (direction === "UP") head.y--;
  if (direction === "DOWN") head.y++;
  if (direction === "LEFT") head.x--;
  if (direction === "RIGHT") head.x++;

  // Screen wrap logic
  if (head.x < 0) head.x = cols - 1;
  if (head.x >= cols) head.x = 0;
  if (head.y < 0) head.y = rows - 1;
  if (head.y >= rows) head.y = 0;

  snake.unshift(head);
  snake.pop();
}

function checkFoodCollision() {
  const head = snake[0];

  if (samePosition(head, food)) {
    score += 1;
    growSnake(1);
    food = randomFreePosition();
    updateHud();
  }
}

function checkEnemyCollision() {
  const head = snake[0];

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    if (samePosition(head, enemy)) {
      if (enemy.type === "small") {
        score += 3;
        growSnake(2);
        enemies.splice(i, 1);
        updateHud();
      } else if (enemy.type === "big") {
        endGame("You hit a big snake. Game over!");
      } else if (enemy.type === "poison") {
        endGame("You ate a poison snake. Game over!");
      }
    }
  }
}

function checkSelfCollision() {
  const head = snake[0];

  for (let i = 1; i < snake.length; i++) {
    if (samePosition(head, snake[i])) {
      endGame("You hit yourself. Game over!");
      return;
    }
  }
}

function updateLevel() {
  let newLevel = 1;

  if (score >= 6) newLevel = 2;
  if (score >= 16) newLevel = 3;
  if (score >= 31) newLevel = 4;
  if (score >= 50) newLevel = 5;
  if (score >= 75) newLevel = 6;

  if (newLevel !== level) {
    level = newLevel;
    speed = Math.max(55, 170 - level * 20);
    updateHud();
    restartLoop();
  }
}

function spawnEnemies() {
  const maxEnemies = level + 2;
  const spawnChance = 0.018 + level * 0.006;

  if (enemies.length >= maxEnemies) return;

  if (Math.random() < spawnChance) {
    const position = randomFreePosition();
    const type = chooseEnemyType();

    enemies.push({
      x: position.x,
      y: position.y,
      type,
      direction: randomDirection()
    });
  }
}

function chooseEnemyType() {
  const random = Math.random();

  if (level === 1) {
    return random < 0.75 ? "small" : "big";
  }

  if (level <= 3) {
    if (random < 0.55) return "small";
    if (random < 0.85) return "big";
    return "poison";
  }

  if (random < 0.4) return "small";
  if (random < 0.7) return "big";
  return "poison";
}

function moveEnemies() {
  enemies.forEach(enemy => {
    if (Math.random() < 0.25) {
      enemy.direction = randomDirection();
    }

    if (enemy.direction === "UP") enemy.y--;
    if (enemy.direction === "DOWN") enemy.y++;
    if (enemy.direction === "LEFT") enemy.x--;
    if (enemy.direction === "RIGHT") enemy.x++;

    if (enemy.x < 0) enemy.x = cols - 1;
    if (enemy.x >= cols) enemy.x = 0;
    if (enemy.y < 0) enemy.y = rows - 1;
    if (enemy.y >= rows) enemy.y = 0;
  });
}

function growSnake(amount) {
  const tail = snake[snake.length - 1];

  for (let i = 0; i < amount; i++) {
    snake.push({ ...tail });
  }
}

function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawFood();
  drawEnemies();
  drawSnake();

  if (isPaused && !isGameOver) {
    drawCenterText("Paused");
  }
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += box) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += box) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((part, index) => {
    ctx.fillStyle = index === 0 ? "#00ff88" : "#00aa55";
    roundedRect(part.x * box + 1, part.y * box + 1, box - 2, box - 2, 5);
  });
}

function drawFood() {
  ctx.fillStyle = "#ffcc00";
  ctx.beginPath();
  ctx.arc(food.x * box + box / 2, food.y * box + box / 2, box / 2.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemies() {
  enemies.forEach(enemy => {
    if (enemy.type === "small") ctx.fillStyle = "#3399ff";
    if (enemy.type === "big") ctx.fillStyle = "#ff3333";
    if (enemy.type === "poison") ctx.fillStyle = "#aa00ff";

    roundedRect(enemy.x * box + 2, enemy.y * box + 2, box - 4, box - 4, 4);
  });
}

function drawCenterText(text) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, canvas.height / 2 - 45, canvas.width, 90);
  ctx.fillStyle = "#ffffff";
  ctx.font = "36px Arial";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 12);
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.fill();
}

function randomFreePosition() {
  let position;
  let safe = false;

  while (!safe) {
    position = {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows)
    };

    safe = !snake.some(part => samePosition(part, position)) &&
           !enemies.some(enemy => samePosition(enemy, position));
  }

  return position;
}

function randomDirection() {
  const dirs = ["UP", "DOWN", "LEFT", "RIGHT"];
  return dirs[Math.floor(Math.random() * dirs.length)];
}

function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}

function updateHud() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  speedEl.textContent = `${level}x`;
}

function endGame(message) {
  isGameOver = true;
  clearInterval(gameLoop);
  drawCenterText("Game Over");

  setTimeout(() => {
    alert(`${message}\nFinal Score: ${score}\nLevel Reached: ${level}`);
  }, 150);
}

function togglePause() {
  if (isGameOver) {
    initGame();
    return;
  }

  isPaused = !isPaused;
  drawGame();
}

startBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", initGame);

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if ((key === "arrowup" || key === "w") && direction !== "DOWN") {
    nextDirection = "UP";
  }

  if ((key === "arrowdown" || key === "s") && direction !== "UP") {
    nextDirection = "DOWN";
  }

  if ((key === "arrowleft" || key === "a") && direction !== "RIGHT") {
    nextDirection = "LEFT";
  }

  if ((key === "arrowright" || key === "d") && direction !== "LEFT") {
    nextDirection = "RIGHT";
  }

  if (key === " " || key === "p") {
    togglePause();
  }
});

initGame();
