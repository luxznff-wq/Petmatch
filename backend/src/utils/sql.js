/**
 * Constructor mínimo de cláusulas WHERE con parámetros posicionales.
 *
 * Nunca interpola valores en el SQL: cada `where(...)` empuja el valor al
 * arreglo de parámetros y sustituye los `?` por `$1`, `$2`, ... Así las
 * consultas dinámicas de filtros (§58) quedan libres de inyección SQL.
 */
export class QueryBuilder {
  constructor() {
    this.conditions = [];
    this.values = [];
  }

  /**
   * @param {string} fragment SQL con tantos `?` como valores se pasen.
   * @param {...unknown} values valores en el mismo orden que los `?`.
   */
  where(fragment, ...values) {
    let index = 0;
    const parameterised = fragment.replace(/\?/g, () => {
      this.values.push(values[index]);
      index += 1;
      return `$${this.values.length}`;
    });
    if (index !== values.length) {
      throw new Error('QueryBuilder: la cantidad de "?" no coincide con los valores');
    }
    this.conditions.push(parameterised);
    return this;
  }

  /** Añade la condición sólo si `value` no es null/undefined/''. */
  whereIfPresent(fragment, value, ...extra) {
    if (value === undefined || value === null || value === '') return this;
    return this.where(fragment, value, ...extra);
  }

  get clause() {
    return this.conditions.length > 0 ? this.conditions.join(' AND ') : 'TRUE';
  }

  /** Reserva el siguiente marcador posicional para LIMIT/OFFSET. */
  push(value) {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}
