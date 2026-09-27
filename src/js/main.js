// main.js
// Bucle, teclado y pantallas. Usa createGame/update/draw (globals).

const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );
const overlay = document.getElementById( 'overlay' );
const actionBtn = document.getElementById( 'action-btn' );

let game = createGame();
let frame = 0;
const STEP_MS = 1000 / 60;
let lastTime = null;
let accumulatedTime = 0;

const KEY_DIR = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

document.addEventListener( 'keydown', ( e ) => {
  const dir = KEY_DIR[ e.key ];
  if ( !dir ) return;
  e.preventDefault();
  if ( game.state === 'playing' ) game.pacman.nextDir = dir;
} );

function showOverlay( title, cls, btnLabel ) {
  overlay.innerHTML =
    '<h1' + ( cls ? ' class="' + cls + '"' : '' ) + '>' + title + '</h1>' +
    '<button id="action-btn">' + btnLabel + '</button>';
  overlay.classList.add( 'show' );
  document.getElementById( 'action-btn' ).addEventListener( 'click', startGame );
}

function startGame() {
  game = createGame();
  game.state = 'playing';
  accumulatedTime = 0;
  overlay.classList.remove( 'show' );
}

if ( actionBtn ) actionBtn.addEventListener( 'click', startGame );

function loop( time ) {
  // Mantener 60 actualizaciones por segundo aunque la pantalla refresque mas rapido.
  if ( lastTime !== null ) {
    const elapsed = time - lastTime;
    // No recuperar de golpe el tiempo de una pestaña inactiva.
    if ( elapsed < 250 ) accumulatedTime += elapsed;
    else accumulatedTime = 0;
  }
  lastTime = time;

  while ( accumulatedTime >= STEP_MS ) {
    accumulatedTime -= STEP_MS;
    frame++;
    if ( game.state === 'playing' ) {
      update( game );
      if ( game.state === 'won' ) showOverlay( 'GANASTE', 'win', 'Reiniciar' );
      else if ( game.state === 'lost' ) showOverlay( 'PERDISTE', 'lose', 'Reiniciar' );
    }
  }
  draw( ctx, game, frame );
  requestAnimationFrame( loop );
}

requestAnimationFrame( loop );
