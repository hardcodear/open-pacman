// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame
const PATROL_TARGETS = [
  { x: 1, y: 5 },
  { x: 26, y: 5 },
  { x: 26, y: 29 },
  { x: 1, y: 29 },
];

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      released: false,
      patrolIndex: 0,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Distancias minimas por casillas hasta el objetivo, incluyendo el tunel.
// La puerta es transitable en ambos sentidos para los fantasmas.
function ghostDistances( grid, targetX, targetY ) {
  const width = grid[ 0 ].length;
  const distances = grid.map( ( row ) => row.map( () => Infinity ) );
  if ( isWall( grid, targetX, targetY, 'ghost' ) ) return distances;

  const queue = [ { x: targetX, y: targetY } ];
  distances[ targetY ][ targetX ] = 0;
  for ( let i = 0; i < queue.length; i++ ) {
    const { x, y } = queue[ i ];
    for ( const dir of Object.keys( DIRS ) ) {
      if ( !canMove( grid, x, y, dir, 'ghost' ) ) continue;
      const d = DIRS[ dir ];
      const nx = ( x + d.x + width ) % width;
      const ny = y + d.y;
      if ( distances[ ny ][ nx ] !== Infinity ) continue;
      distances[ ny ][ nx ] = distances[ y ][ x ] + 1;
      queue.push( { x: nx, y: ny } );
    }
  }
  return distances;
}

// Si el objetivo no es accesible, escoger el mas cercano en distancia
// Manhattan. Recorrer por filas y columnas resuelve los empates.
function reachableTarget( grid, g, targetX, targetY ) {
  const fromGhost = ghostDistances( grid, g.x, g.y );
  if ( targetY >= 0 && targetY < grid.length &&
       targetX >= 0 && targetX < grid[ 0 ].length &&
       fromGhost[ targetY ][ targetX ] !== Infinity ) {
    return { x: targetX, y: targetY };
  }

  let best = null;
  let bestDist = Infinity;
  for ( let y = 0; y < grid.length; y++ ) {
    for ( let x = 0; x < grid[ y ].length; x++ ) {
      if ( fromGhost[ y ][ x ] === Infinity ) continue;
      const dist = Math.abs( x - targetX ) + Math.abs( y - targetY );
      if ( dist < bestDist ) {
        bestDist = dist;
        best = { x, y };
      }
    }
  }
  return best;
}

function routeGhost( grid, g, targetX, targetY, useFallback = false ) {
  const target = useFallback
    ? reachableTarget( grid, g, targetX, targetY )
    : { x: targetX, y: targetY };
  if ( !target ) return;

  const distances = ghostDistances( grid, target.x, target.y );
  const width = grid[ 0 ].length;
  let best = null;
  let bestDist = Infinity;
  // Incluir la media vuelta si conduce a una ruta mas corta.
  for ( const dir of Object.keys( DIRS ) ) {
    if ( !canMove( grid, g.x, g.y, dir, 'ghost' ) ) continue;
    const d = DIRS[ dir ];
    const nx = ( g.x + d.x + width ) % width;
    const dist = distances[ g.y + d.y ][ nx ];
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  if ( best ) g.dir = best;
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const p = game.pacman;

  if ( !g.released && g.x === 13 && g.y === 11 ) g.released = true;
  if ( !g.released ) {
    routeGhost( grid, g, 13, 11 );
    return;
  }

  if ( g.kind === 'hunter' ) {
    routeGhost( grid, g, Math.round( p.x ), Math.round( p.y ) );
    return;
  }
  if ( g.kind === 'ambusher' ) {
    const d = DIRS[ p.dir ];
    routeGhost( grid, g, Math.round( p.x ) + 4 * d.x,
      Math.round( p.y ) + 4 * d.y, true );
    return;
  }
  if ( g.kind === 'patroller' ) {
    let target = PATROL_TARGETS[ g.patrolIndex ];
    const destination = reachableTarget( grid, g, target.x, target.y );
    if ( destination && g.x === destination.x && g.y === destination.y ) {
      g.patrolIndex = ( g.patrolIndex + 1 ) % PATROL_TARGETS.length;
      target = PATROL_TARGETS[ g.patrolIndex ];
    }
    routeGhost( grid, g, target.x, target.y, true );
    return;
  }

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];
  g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.released = false;
    g.patrolIndex = 0;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
