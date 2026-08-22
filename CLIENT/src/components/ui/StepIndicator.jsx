import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

export default function StepIndicator({ steps = [], current = 0, className = '' }) {
  return (
    <div className={`flex items-start ${className}`}>
      {steps.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        const last   = i === steps.length - 1;

        return (
          <div key={step.label} className={`flex items-start ${last ? 'flex-shrink-0' : 'flex-1'}`}>
            {/* Circle + text */}
            <div className="flex flex-col items-center">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200',
                  done   ? 'bg-emerald-500 text-white'             : '',
                  active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : '',
                  !done && !active ? 'bg-slate-100 text-slate-400' : '',
                ].join(' ')}
              >
                {done
                  ? <FontAwesomeIcon icon={faCheck} className="text-xs" />
                  : <span>{i + 1}</span>
                }
              </div>
              <div className="mt-1.5 text-center">
                <p className={`text-xs font-semibold ${active ? 'text-blue-700' : done ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{step.description}</p>
                )}
              </div>
            </div>

            {/* Connector line */}
            {!last && (
              <div className={[
                'flex-1 h-0.5 mt-4 mx-2 rounded transition-colors duration-300',
                done ? 'bg-emerald-400' : 'bg-slate-200',
              ].join(' ')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
