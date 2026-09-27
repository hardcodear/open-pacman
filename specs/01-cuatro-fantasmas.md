# SPEC 01 — Cuatro fantasmas con conductas distintas

> **Status:** Approved
> **Depends on:** None
> **Date:** 2026-09-27
> **Objective:** Incorporar cuatro fantasmas con conductas diferenciadas, incluido un cazador que persigue a Pac-Man por la ruta más corta del laberinto.

## Scope

**In:**

- Iniciar cuatro fantasmas dentro de la jaula y devolverlos allí tras perder una vida.
- Dar prioridad a la salida de la jaula antes de activar la conducta propia de cada fantasma.
- Asignar una estrategia distinta al cazador, emboscador, patrullero y evasivo.
- Calcular rutas transitables que respeten paredes, puerta y túnel.
- Mantener los cuatro colores que ya utiliza `src/js/render.js`.
- Cambiar únicamente `src/js/maze.js` y `src/js/game.js` en el código del juego.

**Out of scope (for future specs):**

- Nuevas reglas de puntuación, vidas, colisiones o velocidad.
- Cambios en la geometría del laberinto o en el aspecto de los fantasmas.
- Leyendas, menús u otros cambios de interfaz.
- Persistencia entre partidas o sesiones.

## Data model

`src/js/maze.js` define los inicios y roles en el orden de los colores existentes de `src/js/render.js`:

```js
const GHOST_STARTS = [
  { x: 12, y: 14, kind: 'hunter' },     // rojo: cazador
  { x: 13, y: 14, kind: 'ambusher' },   // cian: emboscador
  { x: 14, y: 14, kind: 'patroller' },  // rosa: patrullero
  { x: 15, y: 14, kind: 'evasive' },    // naranja: evasivo
];
```

Cada entrada de `game.ghosts` conserva `x`, `y`, `dir`, `speed` y `kind`, y añade `released: false` para controlar la primera salida de la jaula y `patrolIndex: 0` para indicar el siguiente objetivo de patrulla. `createGame()` inicia esos campos y `resetPositions()` los restablece después de perder una vida. No se guardan entre partidas ni sesiones.

Los objetivos de patrulla, en orden cíclico, son `(1,5)`, `(26,5)`, `(26,29)` y `(1,29)`. La salida inicial de la jaula tiene como destino `(13,11)`, casilla exterior accesible a través de la puerta. Las coordenadas son casillas `(x,y)`, con origen arriba a la izquierda.

## Implementation plan

1. En `src/js/maze.js`, definir los cuatro inicios y roles en el orden indicado. Inicializar `released` y `patrolIndex` en `src/js/game.js`; restablecerlos junto con las posiciones tras una colisión. En este paso, los roles nuevos pueden usar provisionalmente la elección de dirección existente: el juego sigue siendo jugable con cuatro fantasmas y los cuatro colores.
2. En `src/js/game.js`, añadir un cálculo de caminos mínimos por casillas para fantasmas. Respetar `canMove(..., 'ghost')`, la puerta en ambos sentidos y el enlace horizontal entre los extremos de la fila 14. Resolver empates entre direcciones en el orden izquierda, derecha, arriba, abajo. Usarlo para que el cazador elija la ruta más corta a la casilla actual de Pac-Man; la partida sigue siendo jugable con las otras conductas provisionales.
3. Hacer que cada fantasma aún no liberado siga la ruta a `(13,11)` y marcar `released` al llegar allí. Al buscar una ruta, permitir media vuelta en una casilla alineada si mejora el recorrido. Añadir al emboscador un objetivo cuatro casillas por delante de la dirección actual de Pac-Man. Si ese objetivo no es transitable o alcanzable, usar la casilla transitable alcanzable más cercana a las coordenadas objetivo, con desempate por fila y luego columna. La partida sigue siendo jugable al completar el paso.
4. Implementar la ruta del patrullero entre los cuatro objetivos fijados, avanzando `patrolIndex` al alcanzar cada uno y volviendo al primero después del cuarto. En el mismo paso, usar el destino alcanzable más cercano si un objetivo no lo fuera. La partida sigue siendo jugable al completar el paso.
5. Implementar el evasivo: medir la distancia mínima en pasos transitables hasta la casilla actual de Pac-Man; si es menor que seis, escoger el siguiente movimiento válido que maximice esa distancia, con el mismo desempate fijo. En caso contrario, elegir aleatoriamente entre direcciones válidas que no sean la contraria a la actual; permitir la contraria si es la única salida. Mantener este comportamiento solo después de su salida inicial de la jaula. La partida sigue siendo jugable al completar el paso.

## Acceptance criteria

- [ ] Al abrir `src/index.html` y comenzar una partida aparecen exactamente cuatro fantasmas, en las casillas `(12,14)`, `(13,14)`, `(14,14)` y `(15,14)`, de colores rojo, cian, rosa y naranja respectivamente.
- [ ] Los cuatro atraviesan la puerta y alcanzan `(13,11)` antes de adoptar sus conductas particulares; ninguno queda deambulando indefinidamente dentro de la jaula al comenzar.
- [ ] En una bifurcación con un obstáculo entre el cazador y Pac-Man, el cazador elige el primer paso de una ruta transitable mínima, también cuando el túnel ofrece el camino más corto.
- [ ] El emboscador se dirige hacia la casilla situada cuatro pasos delante de Pac-Man según su dirección actual; si no es alcanzable, elige un destino alcanzable cercano según la regla definida.
- [ ] El patrullero visita `(1,5)`, `(26,5)`, `(26,29)` y `(1,29)` en ese orden y repite el ciclo.
- [ ] Cuando la distancia real a Pac-Man es menor que seis pasos, el evasivo escoge entre los movimientos válidos uno que maximiza la distancia tras un paso; a seis pasos o más vuelve a deambular.
- [ ] Al perder una vida, los cuatro vuelven a sus posiciones iniciales y vuelven a salir de la jaula; la puntuación y los puntos restantes no se reinician.
- [ ] El juego carga sin errores de consola y mantiene las reglas existentes de vidas, colisiones, puntos y velocidades.

## Decisions

- **Sí:** cuatro roles distintos; el cazador usa caminos mínimos reales en lugar de la aproximación local actual para perseguir de manera consistente.
- **Sí:** todos salen por movimiento normal desde la jaula, con salida prioritaria para impedir que el deambular retenga al evasivo dentro.
- **Sí:** el emboscador anticipa cuatro casillas; el patrullero sigue cuatro puntos fijos; el evasivo huye a menos de seis pasos y deambula cuando está lejos. Así cada rol tiene una conducta observable.
- **Sí:** permitir media vuelta cuando mejora una ruta; prohibirla siempre salvo en callejones podría impedir la persecución por la ruta más corta.
- **Sí:** conservar la puerta transitable en ambos sentidos para fantasmas y los cuatro colores existentes; evita cambiar el laberinto y el renderizado.
- **No:** velocidades distintas, cambios de colisiones, interfaz nueva o persistencia; no forman parte del objetivo acordado.

## Risks

| Risk | Mitigation |
| --- | --- |
| Una ruta calculada sin considerar el túnel produce una persecución incorrecta en la fila 14. | Modelar explícitamente la conexión entre los extremos y comprobar una persecución que la utilice. |
| El objetivo anticipado cae en una pared o en una zona sin acceso desde el fantasma. | Elegir una casilla transitable y alcanzable cercana con desempate determinista. |

## What is **not** in this spec

- Nuevas reglas de puntuación, vidas, colisiones o velocidad.
- Modificaciones del laberinto, colores, apariencia o interfaz.
- Datos persistentes entre partidas o sesiones.
