import { Link } from 'react-router-dom';
import LegalLayout from './LegalLayout.jsx';

/**
 * Términos y condiciones de uso.
 *
 * Texto redactado para el proyecto. No sustituye a una revisión legal:
 * los datos del responsable y la jurisdicción son marcadores de posición.
 */
export default function TermsPage() {
  return (
    <LegalLayout title="Términos y condiciones de uso" updated="25 de agosto de 2026" version="1.0">
      <section>
        <h2>1. Qué es PetMatch y a quién obliga este documento</h2>
        <p>
          PetMatch es una plataforma que pone en contacto a personas interesadas en adoptar una
          mascota con refugios y organizaciones que las tienen a su cargo. Al crear una cuenta o
          usar la plataforma aceptas estos términos. Si no estás de acuerdo con ellos, no uses el
          servicio.
        </p>
        <p>
          Estos términos se complementan con la{' '}
          <Link to="/privacidad">Política de Privacidad</Link>, que explica qué datos tratamos y
          con qué finalidad.
        </p>
      </section>

      <section>
        <h2>2. Qué hace PetMatch y qué no hace</h2>
        <p>
          PetMatch es <strong>un intermediario tecnológico</strong>. Facilitamos la publicación de
          mascotas y la gestión de solicitudes, pero:
        </p>
        <ul>
          <li>No somos propietarios de las mascotas ni participamos en su entrega.</li>
          <li>No somos parte del acuerdo de adopción entre el refugio y la persona adoptante.</li>
          <li>
            No verificamos de forma independiente el estado sanitario, el comportamiento ni el
            historial de cada mascota: esa información la proporciona el refugio y es su
            responsabilidad.
          </li>
          <li>
            La verificación de un refugio confirma que hemos revisado sus datos de contacto, no
            que avalemos sus prácticas.
          </li>
        </ul>
        <p>
          La decisión de adoptar, las condiciones de entrega y cualquier compromiso posterior se
          acuerdan directamente entre la persona adoptante y el refugio.
        </p>
      </section>

      <section>
        <h2>3. Requisitos para usar la plataforma</h2>
        <ul>
          <li>Debes ser mayor de 18 años para registrarte y para enviar solicitudes de adopción.</li>
          <li>
            La información que proporciones debe ser veraz. Al enviar una solicitud declaras
            expresamente que los datos son ciertos.
          </li>
          <li>Eres responsable de mantener tu contraseña en secreto y de la actividad de tu cuenta.</li>
          <li>Cada persona u organización debe usar una sola cuenta.</li>
        </ul>
      </section>

      <section>
        <h2>4. Tipos de cuenta</h2>
        <p>
          <strong>Adoptante.</strong> Puede explorar mascotas, guardarlas como favoritas y enviar
          solicitudes de adopción.
        </p>
        <p>
          <strong>Refugio.</strong> Representa a una organización. Antes de poder publicar debe
          completar su perfil y esperar la verificación de un administrador. Al publicar, el
          refugio garantiza que tiene la mascota legítimamente a su cargo y que la información es
          exacta.
        </p>
        <p>
          <strong>Administrador.</strong> Supervisa la plataforma. Puede verificar o suspender
          refugios y cuentas cuando se incumplen estos términos.
        </p>
      </section>

      <section>
        <h2>5. Conducta prohibida</h2>
        <p>No está permitido usar PetMatch para:</p>
        <ul>
          <li>Vender o comercializar animales. La plataforma es exclusivamente para adopción.</li>
          <li>Publicar mascotas sobre las que no se tiene custodia legítima.</li>
          <li>Publicar información falsa, engañosa u ofensiva, o imágenes que no correspondan.</li>
          <li>Suplantar a otra persona u organización.</li>
          <li>
            Recopilar de forma automatizada los datos de otras personas usuarias, o usar los datos
            de contacto obtenidos para fines distintos del proceso de adopción.
          </li>
          <li>Interferir en el funcionamiento del servicio o intentar acceder a datos ajenos.</li>
        </ul>
      </section>

      <section>
        <h2>6. Contenido que publicas</h2>
        <p>
          Conservas todos los derechos sobre los textos y fotografías que subes. Al publicarlos nos
          concedes una licencia no exclusiva y gratuita para mostrarlos dentro de PetMatch con la
          finalidad de difundir la adopción. Esa licencia termina cuando eliminas el contenido,
          salvo copias que ya formen parte de registros históricos de adopciones.
        </p>
        <p>
          Garantizas que tienes derecho a publicar lo que subes y que no infringe derechos de
          terceros.
        </p>
      </section>

      <section>
        <h2>7. Moderación, suspensión y cierre de cuentas</h2>
        <p>
          Podemos retirar contenido o suspender una cuenta que incumpla estos términos. Cuando sea
          razonable te avisaremos del motivo. En casos graves —fraude, maltrato animal, suplantación—
          la suspensión puede ser inmediata.
        </p>
        <p>
          Puedes cerrar tu cuenta en cualquier momento desde tu perfil. Ten en cuenta que las
          adopciones ya registradas se conservan como parte del historial del refugio, tal y como
          se explica en la Política de Privacidad.
        </p>
      </section>

      <section>
        <h2>8. Disponibilidad del servicio</h2>
        <p>
          PetMatch se ofrece «tal cual». Procuramos que esté siempre disponible, pero no
          garantizamos un funcionamiento ininterrumpido ni libre de errores, y podemos modificar o
          interrumpir funcionalidades avisando con antelación razonable cuando sea posible.
        </p>
      </section>

      <section>
        <h2>9. Responsabilidad</h2>
        <p>
          En la medida que permita la ley aplicable, PetMatch no responde por los acuerdos,
          desacuerdos o daños derivados de la relación entre personas adoptantes y refugios, ni por
          el comportamiento o el estado de salud de una mascota adoptada.
        </p>
        <p>
          Nada en este documento excluye la responsabilidad que legalmente no pueda excluirse.
        </p>
      </section>

      <section>
        <h2>10. Cambios en estos términos</h2>
        <p>
          Si cambiamos estos términos de forma sustancial te lo comunicaremos dentro de la
          plataforma y te pediremos que los aceptes de nuevo antes de seguir usándola. La versión
          vigente siempre está publicada en esta página, con su número y fecha.
        </p>
      </section>

      <section>
        <h2>11. Ley aplicable y contacto</h2>
        <p>
          Estos términos se rigen por la legislación de la República del Perú. Para cualquier
          consulta sobre este documento puedes escribirnos a la dirección indicada al final de esta
          página.
        </p>
      </section>
    </LegalLayout>
  );
}
