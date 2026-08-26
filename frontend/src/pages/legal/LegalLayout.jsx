import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { legalApi } from '../../services/api.js';

/**
 * Envoltorio compartido por los documentos legales: encabezado con la versión
 * vigente, el cuerpo del texto y el bloque de contacto del responsable.
 *
 * Los datos del responsable se piden a la API para que se configuren en un
 * único sitio (variables de entorno) y no queden repetidos en dos textos.
 */
export default function LegalLayout({ title, updated, version, children }) {
  const [contact, setContact] = useState(null);

  useEffect(() => {
    let active = true;
    legalApi
      .info()
      .then((data) => {
        if (active) setContact(data.contact);
      })
      .catch(() => {
        // Si la API no responde, el documento sigue siendo legible.
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <article className="section legal-page">
      <p className="kicker">DOCUMENTO LEGAL</p>
      <h1>{title}</h1>
      <p className="legal-meta">
        Versión {version} · Última actualización: {updated}
      </p>

      <div className="legal-body">{children}</div>

      <footer className="legal-contact">
        <h2>
          <ShieldCheck size={18} aria-hidden="true" /> Responsable y contacto
        </h2>
        {contact ? (
          <dl className="detail-list">
            <div>
              <dt>Responsable</dt>
              <dd>{contact.organization}</dd>
            </div>
            <div>
              <dt>Correo de contacto</dt>
              <dd>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </dd>
            </div>
            <div>
              <dt>Dirección</dt>
              <dd>{contact.address}</dd>
            </div>
            <div>
              <dt>País</dt>
              <dd>{contact.country}</dd>
            </div>
          </dl>
        ) : (
          <p className="muted">Consulta los datos de contacto en la página de inicio.</p>
        )}

        <p className="legal-links">
          <Link to="/terminos">Términos y condiciones</Link> ·{' '}
          <Link to="/privacidad">Política de Privacidad</Link>
        </p>
      </footer>
    </article>
  );
}
