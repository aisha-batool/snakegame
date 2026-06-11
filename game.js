(() => {
  "use strict";
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score"), levelEl = document.getElementById("level"), highScoreEl = document.getElementById("highScore");
  const overlay = document.getElementById("overlay"), overlayTitle = document.getElementById("overlayTitle"), overlayText = document.getElementById("overlayText");
  const startButton = document.getElementById("startButton"), pauseButton = document.getElementById("pauseButton"), restartButton = document.getElementById("restartButton"), howToPlayBtn = document.getElementById("howToPlayBtn");
  const CELL = 20, COLS = Math.floor(canvas.width / CELL), ROWS = Math.floor(canvas.height / CELL);
  const COLORS = { arenaTop:"#061610", arenaBottom:"#020604", grid:"rgba(255,255,255,0.035)", food:"#ffd452", player1:"#55ff99", player2:"#0f8e4d", small1:"#79c2ff", small2:"#2367c9", big1:"#ff7777", big2:"#a4141e", poison1:"#db8cff", poison2:"#6b1ba7", eye:"#031109", tongue:"#ff466a" };
  let player, direction, nextDirection, pendingGrowth, food, enemies, score, level, highScore, state, lastTime, accumulator, tickMs, particles;

  function resetGame(){
    player=[{x:8,y:13},{x:7,y:13},{x:6,y:13},{x:5,y:13},{x:4,y:13}];
    direction="RIGHT"; nextDirection="RIGHT"; pendingGrowth=0; enemies=[]; particles=[]; score=0; level=1; tickMs=150; state="ready"; lastTime=0; accumulator=0;
    highScore=Number(localStorage.getItem("venomArenaHighScore")||0); food=getFreePosition(7); updateHud();
    showOverlay("Enter the Arena","Press Start, Space, or Enter. Eat food and smaller snakes only.","Start Game"); draw();
  }
  function startGame(){ if(state==="gameover") resetGame(); state="playing"; hideOverlay(); lastTime=performance.now(); requestAnimationFrame(gameLoop); }
  function pauseGame(){ if(state==="playing"){state="paused";showOverlay("Paused","Press Space, P, or Resume to continue.","Resume");} else if(state==="paused"||state==="ready") startGame(); }
  function gameLoop(time){ if(state!=="playing") return; const delta=Math.min(time-lastTime,120); lastTime=time; accumulator+=delta; while(accumulator>=tickMs){ update(); accumulator-=tickMs; } updateParticles(); draw(); requestAnimationFrame(gameLoop); }
  function update(){
    direction=nextDirection; const newHead=wrap(movePoint(player[0],direction)); player.unshift(newHead);
    if(pendingGrowth>0) pendingGrowth--; else player.pop();
    if(hitsOwnBody(newHead)) return endGame("You crashed into yourself.");
    if(same(newHead,food)){ score++; pendingGrowth++; burst(food,COLORS.food); food=getFreePosition(6); updateDifficulty(); updateHud(); }
    if(checkEnemyCollision()) return; maybeSpawnEnemy(); moveEnemies(); checkEnemyCollision();
  }
  function moveEnemies(){
    for(const enemy of enemies){ if(Math.random()<enemy.turnChance) enemy.dir=chooseEnemyDirection(enemy); const newHead=wrap(movePoint(enemy.body[0],enemy.dir)); enemy.body.unshift(newHead); enemy.body.pop(); }
    enemies=enemies.filter((enemy,index)=>!enemies.some((other,otherIndex)=>index!==otherIndex&&same(enemy.body[0],other.body[0])));
  }
  function checkEnemyCollision(){
    const head=player[0];
    for(let i=enemies.length-1;i>=0;i--){ const enemy=enemies[i]; const hitIndex=enemy.body.findIndex(part=>same(part,head)); if(hitIndex===-1) continue;
      if(enemy.type==="small" && player.length>enemy.body.length){ score+=3+enemy.body.length; pendingGrowth+=Math.min(6,enemy.body.length); burst(enemy.body[0],COLORS.small1); enemies.splice(i,1); updateDifficulty(); updateHud(); return false; }
      if(enemy.type==="small") endGame("That snake was not small enough to eat."); else if(enemy.type==="big") endGame("You hit a bigger snake."); else endGame("You touched a poison snake."); return true;
    } return false;
  }
  function maybeSpawnEnemy(){
    const maxEnemies=Math.min(2+level,10); if(enemies.length>=maxEnemies) return; const chance=.035+level*.007; if(Math.random()>chance) return;
    const type=chooseEnemyType(), length=enemyLength(type), dir=randomDirection(), start=getFreePosition(8), body=buildEnemyBody(start,dir,length);
    if(!body||body.some(p=>isOccupied(p,4))) return; enemies.push({type,dir,body,turnChance:type==="small"?.28:.18});
  }
  function chooseEnemyType(){ const r=Math.random(); if(level===1) return r<.85?"small":"big"; if(level<=3){ if(r<.58)return"small"; if(r<.86)return"big"; return"poison";} if(r<.43)return"small"; if(r<.70)return"big"; return"poison"; }
  function enemyLength(type){ if(type==="small") return Math.max(2,Math.min(player.length-1,2+Math.floor(Math.random()*4))); if(type==="big") return player.length+2+Math.floor(Math.random()*Math.max(2,level)); return 3+Math.floor(Math.random()*4); }
  function buildEnemyBody(head,dir,length){ const opposite=oppositeDirection(dir), body=[head]; for(let i=1;i<length;i++) body.push(wrap(movePoint(body[i-1],opposite))); return body; }
  function updateDifficulty(){ const newLevel=Math.min(10,1+Math.floor(score/10)); if(newLevel!==level){ level=newLevel; tickMs=Math.max(58,155-(level-1)*11); } }
  function setDirection(dir){ if(state==="ready") startGame(); if(dir===oppositeDirection(direction)||dir===oppositeDirection(nextDirection)) return; nextDirection=dir; }
  function chooseEnemyDirection(enemy){ const dirs=["UP","DOWN","LEFT","RIGHT"].filter(d=>d!==oppositeDirection(enemy.dir)); return dirs[Math.floor(Math.random()*dirs.length)]; }
  function movePoint(point,dir){ if(dir==="UP")return{x:point.x,y:point.y-1}; if(dir==="DOWN")return{x:point.x,y:point.y+1}; if(dir==="LEFT")return{x:point.x-1,y:point.y}; return{x:point.x+1,y:point.y}; }
  function wrap(point){ return{x:(point.x+COLS)%COLS,y:(point.y+ROWS)%ROWS}; }
  function getFreePosition(buffer=0){ for(let tries=0;tries<600;tries++){ const point={x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)}; if(!isOccupied(point,buffer)) return point; } return{x:Math.floor(COLS/2),y:Math.floor(ROWS/2)}; }
  function isOccupied(point,buffer=0){ const allParts=[...player,...enemies.flatMap(enemy=>enemy.body),food].filter(Boolean); return allParts.some(part=>distanceWrapped(point,part)<=buffer); }
  function distanceWrapped(a,b){ const dx=Math.min(Math.abs(a.x-b.x),COLS-Math.abs(a.x-b.x)); const dy=Math.min(Math.abs(a.y-b.y),ROWS-Math.abs(a.y-b.y)); return Math.max(dx,dy); }
  function hitsOwnBody(head){ return player.slice(1).some(part=>same(part,head)); }
  function same(a,b){ return a&&b&&a.x===b.x&&a.y===b.y; }
  function randomDirection(){ const dirs=["UP","DOWN","LEFT","RIGHT"]; return dirs[Math.floor(Math.random()*dirs.length)]; }
  function oppositeDirection(dir){ return{UP:"DOWN",DOWN:"UP",LEFT:"RIGHT",RIGHT:"LEFT"}[dir]; }
  function draw(){ drawArena(); drawFood(); drawEnemies(); drawRealSnake(player,direction,COLORS.player1,COLORS.player2,true); drawParticles(); }
  function drawArena(){ const grad=ctx.createLinearGradient(0,0,0,canvas.height); grad.addColorStop(0,COLORS.arenaTop); grad.addColorStop(1,COLORS.arenaBottom); ctx.fillStyle=grad; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.strokeStyle=COLORS.grid; ctx.lineWidth=1; for(let x=0;x<=canvas.width;x+=CELL){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke()} for(let y=0;y<=canvas.height;y+=CELL){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke()} ctx.strokeStyle="rgba(57,245,141,0.20)"; ctx.lineWidth=10; ctx.strokeRect(5,5,canvas.width-10,canvas.height-10); }
  function drawFood(){ const px=food.x*CELL+CELL/2, py=food.y*CELL+CELL/2; const grad=ctx.createRadialGradient(px-3,py-5,2,px,py,CELL*.48); grad.addColorStop(0,"#fff4a8"); grad.addColorStop(.45,COLORS.food); grad.addColorStop(1,"#d88800"); ctx.shadowColor="rgba(255,212,82,.6)"; ctx.shadowBlur=14; ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(px,py,CELL*.35,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }
  function drawEnemies(){ for(const enemy of enemies){ let c1=COLORS.small1,c2=COLORS.small2; if(enemy.type==="big"){c1=COLORS.big1;c2=COLORS.big2} if(enemy.type==="poison"){c1=COLORS.poison1;c2=COLORS.poison2} drawRealSnake(enemy.body,enemy.dir,c1,c2,false,enemy.type); } }
  function drawRealSnake(body,dir,color1,color2,isPlayer,type="player"){ if(!body.length)return; for(let i=body.length-1;i>=1;i--){ const part=body[i],prev=body[i-1],center=centerOf(part),prevCenter=centerOf(prev); const dx=Math.abs(center.x-prevCenter.x),dy=Math.abs(center.y-prevCenter.y); if(dx<canvas.width/2&&dy<canvas.height/2){ctx.strokeStyle=color2;ctx.lineWidth=CELL*.74;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(center.x,center.y);ctx.lineTo(prevCenter.x,prevCenter.y);ctx.stroke()} drawBodySegment(part,color1,color2,i,type); } drawHead(body[0],dir,color1,color2,isPlayer,type); }
  function drawBodySegment(part,color1,color2,index,type){ const c=centerOf(part), radius=CELL*.42; const grad=ctx.createRadialGradient(c.x-4,c.y-5,2,c.x,c.y,radius); grad.addColorStop(0,lighten(color1)); grad.addColorStop(.52,color1); grad.addColorStop(1,color2); ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(c.x,c.y,radius,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=type==="poison"?"rgba(255,255,255,.32)":"rgba(0,0,0,.20)"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(c.x,c.y,radius*.65,.15*Math.PI,.85*Math.PI); ctx.stroke(); if(index%2===0){ctx.fillStyle="rgba(255,255,255,.12)";ctx.beginPath();ctx.arc(c.x-3,c.y-4,2.3,0,Math.PI*2);ctx.fill()} }
  function drawHead(part,dir,color1,color2,isPlayer,type){ const c=centerOf(part), angle=directionAngle(dir); ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(angle); const headGrad=ctx.createRadialGradient(-5,-7,2,0,0,CELL*.64); headGrad.addColorStop(0,lighten(color1)); headGrad.addColorStop(.52,color1); headGrad.addColorStop(1,color2); ctx.shadowColor=isPlayer?"rgba(57,245,141,.45)":"rgba(255,255,255,.18)"; ctx.shadowBlur=isPlayer?14:8; ctx.fillStyle=headGrad; ctx.beginPath(); ctx.ellipse(2,0,CELL*.62,CELL*.48,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; ctx.fillStyle="rgba(255,255,255,.13)"; ctx.beginPath(); ctx.ellipse(CELL*.38,0,CELL*.13,CELL*.20,0,0,Math.PI*2); ctx.fill(); drawEye(4,-5); drawEye(4,5); if(isPlayer||type==="poison"){ ctx.strokeStyle=COLORS.tongue; ctx.lineWidth=2; ctx.lineCap="round"; ctx.beginPath();ctx.moveTo(CELL*.56,0);ctx.lineTo(CELL*.88,0);ctx.stroke(); ctx.beginPath();ctx.moveTo(CELL*.88,0);ctx.lineTo(CELL*1.05,-4);ctx.stroke(); ctx.beginPath();ctx.moveTo(CELL*.88,0);ctx.lineTo(CELL*1.05,4);ctx.stroke(); } ctx.restore(); }
  function drawEye(x,y){ ctx.fillStyle="#f7ffe9"; ctx.beginPath(); ctx.ellipse(x,y,3.1,4.2,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle=COLORS.eye; ctx.beginPath(); ctx.arc(x+.6,y,1.5,0,Math.PI*2); ctx.fill(); }
  function centerOf(part){ return{x:part.x*CELL+CELL/2,y:part.y*CELL+CELL/2}; }
  function directionAngle(dir){ if(dir==="RIGHT")return 0; if(dir==="DOWN")return Math.PI/2; if(dir==="LEFT")return Math.PI; return -Math.PI/2; }
  function lighten(hex){ const clean=hex.replace("#",""); const num=parseInt(clean,16); const r=Math.min(255,((num>>16)&255)+55),g=Math.min(255,((num>>8)&255)+55),b=Math.min(255,(num&255)+55); return `rgb(${r}, ${g}, ${b})`; }
  function burst(point,color){ const c=centerOf(point); for(let i=0;i<12;i++) particles.push({x:c.x,y:c.y,vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,life:24,color}); }
  function updateParticles(){ for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.life--} particles=particles.filter(p=>p.life>0); }
  function drawParticles(){ for(const p of particles){ ctx.globalAlpha=Math.max(0,p.life/24); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; } }
  function updateHud(){ if(score>highScore){ highScore=score; localStorage.setItem("venomArenaHighScore",String(highScore)); } scoreEl.textContent=score; levelEl.textContent=level; highScoreEl.textContent=highScore; }
  function showOverlay(title,text,buttonText){ overlayTitle.textContent=title; overlayText.textContent=text; startButton.textContent=buttonText; overlay.classList.remove("hidden"); }
  function hideOverlay(){ overlay.classList.add("hidden"); }
  function endGame(reason){ state="gameover"; updateHud(); showOverlay("Game Over",`${reason} Final score: ${score}. Level reached: ${level}.`,"Play Again"); }
  document.addEventListener("keydown",event=>{ const key=event.key.toLowerCase(); if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key)) event.preventDefault(); if(key==="arrowup"||key==="w") setDirection("UP"); if(key==="arrowdown"||key==="s") setDirection("DOWN"); if(key==="arrowleft"||key==="a") setDirection("LEFT"); if(key==="arrowright"||key==="d") setDirection("RIGHT"); if(key===" "||key==="p") pauseGame(); if(key==="enter"&&state!=="playing") startGame(); });
  document.querySelectorAll("[data-dir]").forEach(button=>button.addEventListener("click",()=>setDirection(button.dataset.dir)));
  startButton.addEventListener("click",startGame); pauseButton.addEventListener("click",pauseGame); restartButton.addEventListener("click",()=>{resetGame();startGame();}); howToPlayBtn.addEventListener("click",()=>document.getElementById("rules").scrollIntoView({behavior:"smooth",block:"center"}));
  resetGame();
})();
