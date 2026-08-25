import { Link } from 'react-router-dom';

/** Tarjeta de métrica de los dashboards (§44, §46). */
export default function DashboardCard({ icon: Icon, label, value, hint, to, tone = 'default' }) {
  const content = (
    <>
      {Icon && (
        <span className="dashboard-card-icon" aria-hidden="true">
          <Icon size={20} />
        </span>
      )}
      <span className="dashboard-card-label">{label}</span>
      <strong className="dashboard-card-value">{value}</strong>
      {hint && <small>{hint}</small>}
    </>
  );

  const className = `dashboard-card dashboard-card-${tone}`;
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
