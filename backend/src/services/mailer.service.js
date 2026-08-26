import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Envío de correo transaccional.
 *
 * Si hay SMTP configurado se usa; si no, el correo se imprime en la consola.
 * Esa segunda vía no es un apaño: permite que cualquiera clone el proyecto y
 * pruebe la recuperación de contraseña sin contratar un proveedor, y deja el
 * enlace visible en el registro del servidor.
 *
 * Los fallos de envío nunca interrumpen la operación que los originó: si el
 * correo no sale, el registro del usuario ya se completó y no tiene sentido
 * devolverle un error por algo ajeno a él.
 */

let transporter = null;

/**
 * Hay SMTP utilizable cuando están el servidor **y** las credenciales.
 *
 * Con el servidor configurado pero la clave vacía —el estado natural mientras
 * se prepara el despliegue— el envío fallaría y, si además diéramos el
 * transporte por bueno, el enlace tampoco aparecería en la consola: la
 * recuperación de contraseña quedaría inservible sin que nadie se enterase.
 */
export const hasRealTransport = () => Boolean(env.smtp.host && env.smtp.password);

function getTransporter() {
  if (transporter) return transporter;

  if (hasRealTransport()) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined
    });
  } else {
    if (env.smtp.host && !env.isTest) {
      console.warn(
        `[PetMatch] SMTP_HOST está definido (${env.smtp.host}) pero falta SMTP_PASSWORD: ` +
          'los correos se escribirán en la consola en lugar de enviarse.'
      );
    }
    // `jsonTransport` no abre ninguna conexión: compone el mensaje y lo
    // devuelve, para poder registrarlo.
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

async function send({ to, subject, text, html }) {
  try {
    const info = await getTransporter().sendMail({
      from: env.smtp.from,
      to,
      subject,
      text,
      html
    });

    if (!hasRealTransport() && !env.isTest) {
      console.log(`\n--- Correo para ${to} ---\n${subject}\n${text}\n---\n`);
    }
    return info;
  } catch (error) {
    console.error('[PetMatch] No se pudo enviar el correo:', error.message);
    return null;
  }
}

/** Plantilla mínima común: texto plano y una versión HTML sobria. */
function layout({ heading, body, action }) {
  const text = [heading, '', body, '', action ? `${action.label}: ${action.url}` : '']
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1f1a17">
      <h1 style="font-size:20px">${heading}</h1>
      <p style="color:#5b524c;line-height:1.6">${body}</p>
      ${
        action
          ? `<p style="margin:24px 0">
               <a href="${action.url}"
                  style="background:#ff6b4a;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;display:inline-block">
                 ${action.label}
               </a>
             </p>
             <p style="color:#8b807a;font-size:13px">
               Si el botón no funciona, copia este enlace:<br>${action.url}
             </p>`
          : ''
      }
      <hr style="border:0;border-top:1px solid #e8e0da;margin:24px 0">
      <p style="color:#8b807a;font-size:12px">PetMatch · Adopción responsable de mascotas</p>
    </div>`;

  return { text, html };
}

export function sendVerificationEmail(user, token) {
  const url = `${env.frontendUrl}/verificar-correo?token=${token}`;
  return send({
    to: user.email,
    subject: 'Confirma tu correo en PetMatch',
    ...layout({
      heading: `Hola, ${user.firstName}`,
      body:
        'Confirma tu correo para completar el registro. El enlace caduca en 24 horas. ' +
        'Si no creaste esta cuenta, puedes ignorar este mensaje.',
      action: { label: 'Confirmar mi correo', url }
    })
  });
}

export function sendPasswordResetEmail(user, token) {
  const url = `${env.frontendUrl}/restablecer?token=${token}`;
  return send({
    to: user.email,
    subject: 'Restablece tu contraseña de PetMatch',
    ...layout({
      heading: `Hola, ${user.firstName}`,
      body:
        'Recibimos una solicitud para restablecer tu contraseña. El enlace caduca en una hora ' +
        'y sólo puede usarse una vez. Si no fuiste tú, ignora este mensaje: tu contraseña ' +
        'actual sigue siendo válida.',
      action: { label: 'Crear una contraseña nueva', url }
    })
  });
}

export function sendPasswordChangedEmail(user) {
  return send({
    to: user.email,
    subject: 'Tu contraseña de PetMatch cambió',
    ...layout({
      heading: `Hola, ${user.firstName}`,
      body:
        'Te confirmamos que la contraseña de tu cuenta se cambió correctamente. ' +
        'Si no has sido tú, escríbenos de inmediato.'
    })
  });
}
