import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp, faFilePdf, faFileImage,
  faFileWord, faFile, faXmark,
} from '@fortawesome/free-solid-svg-icons';


function fileIcon(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf')                    return { icon: faFilePdf,   color: 'text-red-500'    };
  if (['jpg','jpeg','png'].includes(ext)) return { icon: faFileImage, color: 'text-blue-500'   };
  if (['doc','docx'].includes(ext))     return { icon: faFileWord,  color: 'text-indigo-500' };
  return { icon: faFile, color: 'text-slate-400' };
}

function formatSize(bytes) {
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function FileUpload({
  accept     = '.pdf,.jpg,.jpeg,.png,.doc,.docx',
  maxSizeMB  = 5,
  onFile,
  label      = 'Drag and drop a file here, or click to browse',
  className  = '',
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging]   = useState(false);
  const [selected, setSelected]   = useState(null);
  const [error,    setError]      = useState('');

  const validate = (file) => {
    if (!file) return 'No file selected.';
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > maxSizeMB) return `File exceeds ${maxSizeMB} MB limit (${formatSize(file.size)}).`;
    const exts = accept.split(',').map(s => s.trim().toLowerCase().replace('*', ''));
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!exts.includes(fileExt) && !exts.includes(file.type)) return `File type not allowed. Accepted: ${accept}`;
    return null;
  };

  const pick = (file) => {
    const err = validate(file);
    if (err) { setError(err); setSelected(null); return; }
    setError('');
    setSelected(file);
    onFile?.(file);
  };

  const onInputChange = (e) => pick(e.target.files?.[0]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0]);
  };

  const clear = () => {
    setSelected(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const fi = selected ? fileIcon(selected) : null;

  return (
    <div className={className}>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true);  }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDragOver={(e)  => e.preventDefault()}
        onDrop={onDrop}
        className={[
          'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8',
          'cursor-pointer transition-all duration-150',
          dragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40',
          selected ? 'hidden' : '',
        ].join(' ')}
      >
        <FontAwesomeIcon icon={faCloudArrowUp} className={`text-3xl ${dragging ? 'text-blue-400' : 'text-slate-300'}`} />
        <p className="text-sm text-slate-500 text-center">{label}</p>
        <p className="text-xs text-slate-400">Max {maxSizeMB} MB · {accept}</p>
      </div>

      {/* Selected file preview */}
      {selected && (
        <div className="flex items-center gap-3 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3">
          <FontAwesomeIcon icon={fi.icon} className={`text-2xl flex-shrink-0 ${fi.color}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{selected.name}</p>
            <p className="text-xs text-slate-400">{formatSize(selected.size)}</p>
          </div>
          <button
            onClick={clear}
            className="flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors p-1"
            aria-label="Remove file"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      {/* Error */}
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}

      {/* Hidden native input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onInputChange}
        className="hidden"
      />
    </div>
  );
}
