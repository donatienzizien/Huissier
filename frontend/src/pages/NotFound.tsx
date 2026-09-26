import { Link } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 via-white to-brass-50 px-6">
      <section className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 text-brass-400 shadow-lg">
          <FileQuestion size={32} aria-hidden="true" />
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-brass-700">
          Erreur 404
        </p>

        <h1 className="mt-2 font-serif text-3xl font-semibold text-navy-900">
          Page introuvable
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          La page demandée n’existe pas, a été déplacée ou vous n’y avez pas accès.
        </p>

        <Link
          to="/dashboard"
          className="mt-7 inline-flex items-center gap-2 rounded-md bg-navy-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-700"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Retour au tableau de bord
        </Link>
      </section>
    </main>
  );
}
