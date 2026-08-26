import { Link } from 'react-router-dom';
import LegalLayout from './LegalLayout.jsx';

/**
 * Política de privacidad, estructurada según la Ley 29733 de Protección de
 * Datos Personales (Perú) y su reglamento.
 *
 * Texto redactado para el proyecto. Requiere revisión legal y completar los
 * datos del responsable antes de una publicación real.
 */
export default function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidad" updated="25 de agosto de 2026" version="1.0">
      <section>
        <h2>1. Quién trata tus datos</h2>
        <p>
          El responsable del tratamiento es la organización que opera PetMatch, cuyos datos de
          contacto figuran al final de esta página. Puedes dirigirte a esa dirección para cualquier
          asunto relacionado con tus datos personales.
        </p>
      </section>

      <section>
        <h2>2. Qué datos recogemos y para qué</h2>
        <p>Sólo tratamos los datos necesarios para que la plataforma funcione:</p>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Datos</th>
                <th scope="col">Para qué</th>
                <th scope="col">Base legal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Datos">Nombre, apellidos, correo y contraseña</td>
                <td data-label="Para qué">Crear tu cuenta e identificarte al iniciar sesión</td>
                <td data-label="Base legal">Ejecución del servicio que solicitas</td>
              </tr>
              <tr>
                <td data-label="Datos">Teléfono, dirección y ciudad</td>
                <td data-label="Para qué">
                  Completar solicitudes de adopción y permitir que el refugio te contacte
                </td>
                <td data-label="Base legal">Consentimiento al enviar la solicitud</td>
              </tr>
              <tr>
                <td data-label="Datos">
                  Datos de la solicitud: edad, tipo de vivienda, convivencia, experiencia y
                  motivación
                </td>
                <td data-label="Para qué">
                  Que el refugio evalúe si la adopción es adecuada para la mascota
                </td>
                <td data-label="Base legal">Consentimiento explícito</td>
              </tr>
              <tr>
                <td data-label="Datos">Favoritos y notificaciones</td>
                <td data-label="Para qué">Mostrarte tu actividad y avisarte de cambios</td>
                <td data-label="Base legal">Ejecución del servicio</td>
              </tr>
              <tr>
                <td data-label="Datos">Registro de acciones administrativas (auditoría)</td>
                <td data-label="Para qué">
                  Trazabilidad y seguridad: saber quién hizo cada cambio relevante
                </td>
                <td data-label="Base legal">Interés legítimo en la seguridad del servicio</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          <strong>No recogemos datos sensibles</strong> (salud, origen étnico, ideología, datos
          biométricos) y te pedimos que no los incluyas en los campos de texto libre.
        </p>
        <p>
          <strong>No usamos cookies de publicidad ni de seguimiento.</strong> Guardamos únicamente
          tu sesión en el navegador para no pedirte la contraseña en cada página; esa información
          desaparece al cerrar sesión.
        </p>
      </section>

      <section>
        <h2>3. Quién puede ver tus datos</h2>
        <p>
          Cuando envías una solicitud de adopción, <strong>el refugio propietario de esa mascota
          ve los datos que declaraste</strong>: nombre, edad, teléfono, correo, dirección, ciudad,
          información de vivienda, experiencia y motivación. Los necesita para valorar la adopción
          y ponerse en contacto contigo. Enviar la solicitud es voluntario y equivale a autorizar
          esa comunicación.
        </p>
        <p>Además:</p>
        <ul>
          <li>
            El personal administrador de PetMatch puede acceder a los datos para supervisar la
            plataforma y resolver incidencias.
          </li>
          <li>
            Los proveedores que alojan la aplicación y la base de datos procesan los datos por
            nuestra cuenta y bajo obligación de confidencialidad.
          </li>
          <li>
            <strong>No vendemos ni cedemos tus datos</strong> a terceros con fines comerciales.
          </li>
          <li>
            Sólo los entregaríamos a una autoridad si una norma o una resolución judicial nos
            obligara.
          </li>
        </ul>
        <p>
          Tu perfil no es público: las personas que visitan PetMatch sin cuenta ven las mascotas y
          los refugios, nunca los datos de otras personas adoptantes.
        </p>
      </section>

      <section>
        <h2>4. Cuánto tiempo conservamos los datos</h2>
        <ul>
          <li>
            <strong>Tu cuenta:</strong> mientras la mantengas abierta.
          </li>
          <li>
            <strong>Solicitudes no completadas:</strong> se eliminan cuando cierras tu cuenta.
          </li>
          <li>
            <strong>Adopciones registradas:</strong> se conservan como historial del refugio,
            incluso si cierras tu cuenta. Es la constancia de que la adopción existió. En ese caso
            desvinculamos los datos que no sean imprescindibles.
          </li>
          <li>
            <strong>Registros de auditoría:</strong> se conservan por seguridad. Si eliminas tu
            cuenta, el registro deja de estar asociado a tu usuario.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Tus derechos</h2>
        <p>
          La Ley 29733 te reconoce los derechos de <strong>acceso, rectificación, cancelación y
          oposición</strong>. En la práctica:
        </p>
        <ul>
          <li>
            <strong>Acceso y portabilidad.</strong> Desde tu perfil puedes descargar en cualquier
            momento un archivo con todos tus datos, en formato legible por máquina.
          </li>
          <li>
            <strong>Rectificación.</strong> Puedes editar tus datos personales desde tu perfil.
          </li>
          <li>
            <strong>Cancelación.</strong> Puedes eliminar tu cuenta desde tu perfil. La eliminación
            es inmediata y no reversible.
          </li>
          <li>
            <strong>Oposición.</strong> Puedes escribirnos para oponerte a un tratamiento concreto.
          </li>
        </ul>
        <p>
          Responderemos a cualquier solicitud en un plazo máximo de veinte días hábiles. Si
          consideras que no hemos atendido tus derechos, puedes presentar una reclamación ante la
          Autoridad Nacional de Protección de Datos Personales del Ministerio de Justicia.
        </p>
      </section>

      <section>
        <h2>6. Seguridad</h2>
        <p>Las medidas técnicas que aplicamos:</p>
        <ul>
          <li>Las contraseñas se guardan cifradas con bcrypt; nadie puede leerlas, tampoco nosotros.</li>
          <li>El acceso a la API exige un identificador de sesión firmado y con caducidad.</li>
          <li>
            Cada petición vuelve a comprobar en el servidor si tienes permiso: no basta con que la
            interfaz oculte una opción.
          </li>
          <li>La comunicación viaja cifrada mediante HTTPS.</li>
          <li>Limitamos el número de intentos de acceso para dificultar ataques por fuerza bruta.</li>
        </ul>
        <p>
          Ningún sistema es infalible. Si ocurriera una brecha que afecte a tus datos, te lo
          comunicaríamos y lo notificaríamos a la autoridad competente.
        </p>
      </section>

      <section>
        <h2>7. Menores de edad</h2>
        <p>
          PetMatch está dirigido a mayores de 18 años. No creamos cuentas de menores de forma
          consciente. Si detectamos una, la eliminamos.
        </p>
      </section>

      <section>
        <h2>8. Cambios en esta política</h2>
        <p>
          Si modificamos esta política de forma sustancial te avisaremos dentro de la plataforma y,
          cuando la ley lo exija, te pediremos que la aceptes de nuevo. Puedes consultar la versión
          vigente y su fecha al inicio de esta página.
        </p>
        <p>
          Consulta también los <Link to="/terminos">Términos y condiciones</Link>.
        </p>
      </section>
    </LegalLayout>
  );
}
