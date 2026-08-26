import { Link } from 'react-router-dom';

/**
 * Botón único de la aplicación. Renderiza <button>, <a> o <Link> según se
 * indique `to` o `href`, manteniendo el mismo aspecto en los tres casos.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  to,
  href,
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  children,
  ...props
}) {
  const classes = ['btn', `btn-${variant}`, `btn-${size}`, className].filter(Boolean).join(' ');
  const content = (
    <>
      {Icon && !loading && <Icon size={16} aria-hidden="true" />}
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {children}
    </>
  );

  // Un enlace no admite `disabled`: seguiría navegando. Cuando la acción no
  // está disponible se renderiza un botón inhabilitado de verdad, para que no
  // se pueda pulsar, quede fuera del recorrido de tabulación y los lectores
  // de pantalla lo anuncien como tal.
  const unavailable = disabled || loading;

  if (to && !unavailable) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  if (href && !unavailable) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer noopener" {...props}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={classes} disabled={unavailable} {...props}>
      {content}
    </button>
  );
}
