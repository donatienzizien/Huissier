import { useState } from 'react';

interface Props {
  userId?: string | null;
  initiales: string;
  size?: number;
  className?: string;
}

// Tente de charger la photo de profil de l'utilisateur ; si elle
// n'existe pas (404) ou si aucun userId n'est fourni, retombe sur les
// initiales — même fallback que l'ancien affichage, sans changement de
// comportement visible pour les utilisateurs sans photo.
export default function UserAvatar({ userId, initiales, size = 28, className = '' }: Props) {
  const [echec, setEchec] = useState(false);
  const afficherImage = Boolean(userId) && !echec;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full overflow-hidden bg-brass-400/20 text-brass-300 font-semibold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {afficherImage ? (
        <img
          src={`/api/avatars/${userId}`}
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
