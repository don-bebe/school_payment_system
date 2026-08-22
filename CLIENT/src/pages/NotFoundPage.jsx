import { useNavigate } from 'react-router-dom';
import { faHouse, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-6">
      {/* Large 404 */}
      <div className="relative mb-8">
        <p className="text-[140px] font-black text-slate-100 leading-none select-none">404</p>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-lg px-8 py-5 border border-slate-200">
            <p className="text-2xl font-bold text-slate-800">Page not found</p>
            <p className="text-slate-500 text-sm mt-1">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <Button variant="secondary" icon={faArrowLeft} onClick={() => navigate(-1)}>
          Go Back
        </Button>
        <Button icon={faHouse} onClick={() => navigate('/')}>
          Dashboard
        </Button>
      </div>
    </div>
  );
}
