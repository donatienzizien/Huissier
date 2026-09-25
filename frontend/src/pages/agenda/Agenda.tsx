import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Bell, Clock, Calendar, CalendarOff, CalendarCheck, CalendarClock, CalendarRange } from 'lucide-react';
import { api } from '../../lib/api';
import { Evenement } from '../../types';
import { SOLID, TINT_BG, TINT_TEXT } from '../../lib/theme';
import EvenementModal from './EvenementModal';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function memeJour(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function libelleRelatif(dateStr: string): string | null {
  const d = new Date(dateStr);
  const aujourdhui = new Date();
  const demain = new Date();
  demain.setDate(aujourdhui.getDate() + 1);
  if (memeJour(d, aujourdhui)) return "Aujourd'hui";
  if (memeJour(d, demain)) return 'Demain';
  return null;
}

function DaySkeleton() {
  return (
    <div>
      <div className="h-3 w-40 rounded bg-gray-100 animate-pulse mb-2" />
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-4 w-12 rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-48 rounded bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Agenda() {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Evenement | null>(null);

  const today = new Date();
  const dansUnMois = new Date();
  dansUnMois.setDate(today.getDate() + 30);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<Evenement[]>('/agenda', {
        params: { dateDebut: isoDateOnly(today), dateFin: isoDateOnly(dansUnMois) },
      });
      setEvenements(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet evenement ?')) return;
    await api.delete(`/agenda/${id}`);
    load();
  }

  const parJour = evenements.reduce<Record<string, Evenement[]>>((acc, e) => {
    const key = new Date(e.date_debut).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    acc[key] = acc[key] ?? [];
    acc[key].push(e);
    return acc;
  }, {});

  const finSemaine = new Date();
  finSemaine.setDate(today.getDate() + (7 - today.getDay()));
  const nbAujourdhui = evenements.filter((e) => memeJour(new Date(e.date_debut), today)).length;
  const nbCetteSemaine = evenements.filter((e) => new Date(e.date_debut) <= finSemaine).length;
  const nbAvecRappel = evenements.filter((e) => e.rappel_j1 || e.rappel_j7).length;

  return (
    <div>
      <PageHeader
        icon={Calendar}
        title="Agenda"
        subtitle="Prochains 30 jours."
        accent="wine"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-wine-600 hover:bg-wine-700 text-white text-sm font-medium rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-all"
          >
            <Plus size={16} /> Nouvel evenement
          </button>
        }
      />

      {!loading && evenements.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className={`${SOLID.wine} rounded-xl p-4 shadow-md relative overflow-hidden`}>
            <CalendarCheck size={54} className="absolute -right-2 -bottom-2 text-white/10" strokeWidth={1.2} />
            <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center mb-3 relative">
              <CalendarCheck size={17} className="text-white" />
            </div>
            <p className="text-xs text-white/75 uppercase tracking-wide font-medium relative">Aujourd'hui</p>
            <p className="font-nums text-xl text-white mt-1 font-semibold relative">{nbAujourdhui}</p>
          </div>
          <div className={`${SOLID.navy} rounded-xl p-4 shadow-md relative overflow-hidden`}>
            <CalendarRange size={54} className="absolute -right-2 -bottom-2 text-white/10" strokeWidth={1.2} />
            <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center mb-3 relative">
              <CalendarRange size={17} className="text-white" />
            </div>
            <p className="text-xs text-white/75 uppercase tracking-wide font-medium relative">Cette semaine</p>
            <p className="font-nums text-xl text-white mt-1 font-semibold relative">{nbCetteSemaine}</p>
          </div>
          <div className={`${SOLID.brass} rounded-xl p-4 shadow-md relative overflow-hidden`}>
            <Bell size={54} className="absolute -right-2 -bottom-2 text-white/10" strokeWidth={1.2} />
            <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center mb-3 relative">
              <Bell size={17} className="text-white" />
            </div>
            <p className="text-xs text-white/75 uppercase tracking-wide font-medium relative">Avec rappel</p>
            <p className="font-nums text-xl text-white mt-1 font-semibold relative">{nbAvecRappel}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <DaySkeleton />
          <DaySkeleton />
        </div>
      ) : evenements.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <EmptyState
            icon={CalendarOff}
            title="Aucun evenement a venir"
            description="Planifiez un rendez-vous ou un rappel pour les 30 prochains jours."
            actionLabel="Nouvel evenement"
            onAction={() => setShowCreate(true)}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(parJour).map(([jour, evts]) => {
            const relatif = libelleRelatif(evts[0].date_debut);
            return (
              <div key={jour}>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xs font-semibold uppercase text-gray-500">{jour}</h2>
                  {relatif && (
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${TINT_BG.wine} ${TINT_TEXT.wine}`}>
                      {relatif}
                    </span>
                  )}
                </div>
                <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-wine-600 divide-y divide-gray-100 shadow-sm">
                  {evts.map((e) => (
                    <div key={e.id} className="flex items-start justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-gray-400" />
                          <span className="font-nums text-sm font-medium text-navy-900">
                            {new Date(e.date_debut).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <button
                            onClick={() => setEditing(e)}
                            className="text-sm font-medium text-gray-800 hover:underline text-left"
                          >
                            {e.titre}
                          </button>
                          {(e.rappel_j1 || e.rappel_j7) && <Bell size={12} className="text-brass-600" />}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex gap-2 flex-wrap">
                          {e.dossier_numero && (
                            <Link to={`/dossiers/${e.dossier_id}`} className="font-nums text-navy-700 hover:underline">
                              {e.dossier_numero}
                            </Link>
                          )}
                          {e.assigne_nom && (
                            <span>
                              · {e.assigne_nom} {e.assigne_prenom}
                            </span>
                          )}
                        </div>
                        {e.description && <p className="text-xs text-gray-500 mt-1">{e.description}</p>}
                      </div>
                      <button onClick={() => handleDelete(e.id)} className="text-gray-300 hover:text-wine-600">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <EvenementModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
      {editing && (
        <EvenementModal
          evenement={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
