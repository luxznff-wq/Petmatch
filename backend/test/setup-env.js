/**
 * Preludio de las pruebas.
 *
 * Se carga con `node --import` antes que cualquier otro módulo, de modo que
 * `src/config/env.js` ya vea NODE_ENV=test al evaluarse. Sin esto haría falta
 * definir la variable desde la línea de comandos, que no es portable entre
 * Windows y sistemas POSIX.
 */
process.env.NODE_ENV ??= 'test';
