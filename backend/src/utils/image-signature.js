import { open } from 'node:fs/promises';

/**
 * Verificación del contenido real de una imagen.
 *
 * El `Content-Type` que llega en la petición lo elige quien sube el archivo,
 * así que no prueba nada: basta declarar `image/png` para colar cualquier
 * cosa. Aquí se leen los primeros bytes y se comparan con la firma del
 * formato, que sí depende del contenido.
 */

/** Bytes iniciales que identifican cada formato admitido. */
const SIGNATURES = [
  { mime: 'image/jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // WEBP y AVIF son contenedores: la marca útil no está al principio.
  { mime: 'image/webp', offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // "WEBP"
  { mime: 'image/avif', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] } // "ftyp"
];

/** Bytes necesarios para poder comprobar cualquiera de las firmas. */
const HEADER_SIZE = 16;

/** Compara el encabezado con una firma concreta. */
const matches = (header, { offset, bytes }) =>
  bytes.every((byte, index) => header[offset + index] === byte);

/**
 * Devuelve el tipo real del archivo, o `null` si no es una imagen admitida.
 * @param {string} path ruta del archivo ya guardado en disco
 */
export async function detectImageType(path) {
  let handle;
  try {
    handle = await open(path, 'r');
    const header = Buffer.alloc(HEADER_SIZE);
    const { bytesRead } = await handle.read(header, 0, HEADER_SIZE, 0);
    if (bytesRead < 12) return null;

    return SIGNATURES.find((signature) => matches(header, signature))?.mime ?? null;
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
}
