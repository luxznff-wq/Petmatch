import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Última red de seguridad de la interfaz (§77).
 *
 * Sin ella, un error durante el render deja la pantalla en blanco y sin
 * explicación. React sólo permite capturarlo desde un componente de clase,
 * que es el único motivo por el que este archivo no usa hooks.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // En un despliegue real este es el punto de envío a un servicio de
    // seguimiento de errores; aquí basta con dejar rastro en la consola.
    console.error('[PetMatch] Error de interfaz no controlado:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <section className="section error-screen" role="alert">
        <AlertTriangle size={40} aria-hidden="true" />
        <h1>Algo se rompió en esta pantalla</h1>
        <p className="muted">
          No pudimos mostrar esta página. El resto de PetMatch sigue funcionando: vuelve al
          inicio o inténtalo de nuevo.
        </p>

        <div className="pet-detail-actions">
          <button type="button" className="btn btn-primary btn-md" onClick={this.handleReset}>
            Reintentar
          </button>
          <a href="/" className="btn btn-outline btn-md">
            Volver al inicio
          </a>
        </div>

        {/* Detalle técnico plegado: útil al desarrollar, discreto para el resto. */}
        <details className="error-screen-details">
          <summary>Detalle técnico</summary>
          <pre>{error.message}</pre>
        </details>
      </section>
    );
  }
}
