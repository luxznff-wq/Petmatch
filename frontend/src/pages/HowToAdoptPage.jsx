import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import { HOW_IT_WORKS } from '../utils/constants.js';

/** Página explicativa del proceso (§12). */
export default function HowToAdoptPage() {
  const faqs = [
    {
      question: '¿Necesito una cuenta para adoptar?',
      answer:
        'Sí. Solo los usuarios registrados como adoptantes pueden enviar solicitudes, para que el refugio sepa con quién está hablando.'
    },
    {
      question: '¿Cuánto dura el proceso?',
      answer:
        'Depende de cada refugio. Normalmente pasa por revisión, una entrevista y la decisión final. Podrás seguir cada cambio de estado desde tu panel.'
    },
    {
      question: '¿Puedo cancelar mi solicitud?',
      answer:
        'Puedes cancelarla mientras esté pendiente o en revisión. Una vez agendada la entrevista, coordina directamente con el refugio.'
    },
    {
      question: '¿Puedo solicitar varias mascotas?',
      answer:
        'Sí, pero solo una solicitud activa por mascota. Así los refugios evitan duplicados y pueden responder con más claridad.'
    },
    {
      question: 'Represento un refugio, ¿cómo publico mascotas?',
      answer:
        'Crea una cuenta de tipo refugio, completa el perfil de tu organización y espera la verificación del equipo de PetMatch. Después podrás publicar y gestionar tus mascotas.'
    }
  ];

  return (
    <section className="section how-page">
      <header className="section-head">
        <div>
          <p className="kicker">¿CÓMO ADOPTAR?</p>
          <h1>Adoptar es más fácil de lo que imaginas</h1>
          <p className="muted">
            Cuatro pasos y un proceso acompañado por el refugio de principio a fin.
          </p>
        </div>
      </header>

      <ol className="steps steps-large">
        {HOW_IT_WORKS.map((item) => (
          <li key={item.step}>
            <b>{item.step}</b>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </li>
        ))}
      </ol>

      <section className="faq">
        <h2>Preguntas frecuentes</h2>
        {faqs.map((faq) => (
          <details key={faq.question}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </section>

      <div className="cta-panel">
        <div>
          <h2>¿Listo para conocer a tu nuevo compañero?</h2>
          <p>Explora las mascotas disponibles y envía tu primera solicitud.</p>
        </div>
        <Button to="/mascotas">Buscar mascotas</Button>
      </div>

      <p className="muted">
        ¿Representas un refugio? <Link to="/registro">Crea tu cuenta</Link> y publica tus mascotas.
      </p>
    </section>
  );
}
