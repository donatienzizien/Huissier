import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Props {
  userId?: string | null;
  initiales: string;
  size?: number;
  className?: string;
}

export default function UserAvatar({ userId, initiales, size = 28, className = '' }: Props) {
  const [urlSignee, setUrlSignee] = useState<string | null>(null);
  const [echec, setEchec] = useState(false);

  useEffect(() => {
    let annule = false;

    async function chargerAvatar() {
      setUrlSignee(null);
      setEchec(false);

      if (!userId) return;

      try {
        const { data } = await api.get<{ url: string }>(
          `/avatars/${userId}/signed-url`,
        );
        if (!annule) setUrlSignee(data.url);
      } catch {
        if (!annule) setEchec(true);
      }
    }

    chargerAvatar();

    return () => {
      annule = true;
    };
  }, [userId]);

  const afficherImage = Boolean(urlSignee) && !echec;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full overflow-hidden bg-brass-400/20 text-brass-300 font-semibold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {afficherImage ? (
        <img
          src={urlSignee as string}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setEchec(true)}
        />
      ) : (
        initiales
      )}
    </span>
  );
}