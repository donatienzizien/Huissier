import { ChangeEvent, useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { api } from '../lib/api';

interface Props {
  userId: string;
  hasPhotoInitial: boolean;
  initiales: string;
  size?: number;
  onChange?: (hasPhoto: boolean) => void;
}

// Composant autonome pour changer sa propre photo de profil, à tout
// moment (pas juste une fois) : le bouton affiche "Changer la photo" dès
// qu'une photo existe, et un bouton "Retirer" apparaît en complément.
export default function AvatarUpload({ userId, hasPhotoInitial, initiales, size = 88, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState(() => Date.now());
  const [photoPresente, setPhotoPresente] = useState(hasPhotoInitial);
  const [erreur, setErreur] = useState<string | null>(null);

  const src = preview ?? (photoPresente ? `/api/avatars/${userId}?v=${cacheBust}` : null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErreur(null);

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setErreur('Format non supporté. Utilisez une image JPG ou PNG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErreur('Image trop lourde (2 Mo maximum).');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      await api.post('/users/moi/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotoPresente(true);
      setCacheBust(Date.now());
      onChange?.(true);
    } catch {
      setErreur("L'envoi a échoué. Réessayez.");
      setPreview(null);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove() {
    setErreur(null);
    setLoading(true);
    try {
      await api.delete('/users/moi/photo');
      setPhotoPresente(false);
      setPreview(null);
      onChange?.(false);
    } catch {
      setErreur('La suppression a échoué. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <div
          className="relative rounded-full overflow-hidden bg-navy-100 flex items-center justify-center shrink-0 border border-navy-200"
          style={{ width: size, height: size }}
        >
          {src ? (
            <img src={src} alt="Photo de profil" className="w-full h-full object-cover" />
          ) : (
            <span className="font-semibold text-navy-700" style={{ fontSize: size * 0.35 }}>
              {initiales}
            </span>
          )}
          {loading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 size={size * 0.3} className="text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:text-navy-900 disabled:opacity-50"
          >
            <Camera size={15} />
            {photoPresente ? 'Changer la photo' : 'Ajouter une photo'}
          </button>
          {photoPresente && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              <X size={15} />
              Retirer la photo
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {erreur && <p className="text-xs text-red-600 mt-2">{erreur}</p>}
    </div>
  );
}
