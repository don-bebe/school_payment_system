import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export default function PageHeader({
  title,
  subtitle,
  badge,          // ReactNode — shown inline next to title
  back    = false,
  backTo,         // if provided, navigate to this path instead of -1
  actions,
  className = '',
  divider   = true,
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) navigate(backTo);
    else navigate(-1);
  };

  return (
    <div className={[
      divider ? 'border-b border-slate-200 pb-4 mb-5' : '',
      className,
    ].join(' ')}>
      <div className="flex items-start gap-3">
        {back && (
          <button
            onClick={handleBack}
            className="mt-0.5 p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 truncate">{title}</h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
