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

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer noopener" {...props}>
        {content}
      </a>
    );
  }
  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}
