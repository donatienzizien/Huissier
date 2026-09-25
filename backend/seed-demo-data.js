// seed-demo-data.js
//
// Peuple le tenant "test2" avec des données de démo réalistes en passant
// par l'API réelle (pas d'accès direct à la base) : respecte la génération
// automatique des numéros, les transitions de statut de facture, et
// l'isolation multi-tenant.
//
// UTILISATION (PowerShell, depuis n'importe quel dossier, Node 18+ requis) :
//
//   $env:SEED_EMAIL   = "ton-email-de-connexion@ex.com"
//   $env:SEED_PASSWORD = "ton-mot-de-passe"
//   node seed-demo-data.js
//
// Optionnel :
//   $env:SEED_BASE_URL = "http://test2.localhost:3000/api"   (valeur par défaut)
//   $env:SEED_CLIENTS  = "10"                                 (nombre de clients à créer)

const BASE_URL = process.env.SEED_BASE_URL || 'http://test2.localhost:3000/api';
const EMAIL = process.env.SEED_EMAIL;
const PASSWORD = process.env.SEED_PASSWORD;
const NB_CLIENTS = parseInt(process.env.SEED_CLIENTS || '10', 10);

if (!EMAIL || !PASSWORD) {
  console.error('❌ Définis $env:SEED_EMAIL et $env:SEED_PASSWORD avant de lancer ce script.');
  console.error('   Exemple :');
  console.error('   $env:SEED_EMAIL = "toi@example.com"');
  console.error('   $env:SEED_PASSWORD = "ton-mot-de-passe"');
  console.error('   node seed-demo-data.js');
  process.exit(1);
}

async function api(method, path, token, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> HTTP ${res.status} : ${JSON.stringify(data)}`);
  }
  return data;
}

// --- Données réalistes pour le contexte burkinabè -------------------------

const PRENOMS_H = ['Issa', 'Boureima', 'Moussa', 'Rasmané', 'Adama', 'Salif', 'Ousmane', 'Idrissa', 'Yacouba', 'Seydou'];
const PRENOMS_F = ['Aïssata', 'Fatimata', 'Awa', 'Mariam', 'Rasmata', 'Salamata', 'Kadiatou', 'Bintou', 'Aminata', 'Assita'];
const NOMS = ['Ouédraogo', 'Compaoré', 'Sawadogo', 'Kaboré', 'Zongo', 'Traoré', 'Nikiéma', 'Congo', 'Bamogo', 'Sanou', 'Ilboudo', 'Sana'];
const QUARTIERS = ['Gounghin', 'Tanghin', 'Cissin', 'Wemtenga', 'Somgandé', 'Pissy', 'Dassasgho', 'Zogona', 'Karpala', 'Kilwin'];

const TYPES_DOSSIER = ['RECOUVREMENT', 'EXPULSION', 'SIGNIFICATION', 'SAISIE', 'AUTRE'];
const DESCRIPTIONS_TYPE = {
  RECOUVREMENT: 'Recouvrement de créance impayée',
  EXPULSION: "Procédure d'expulsion pour loyers impayés",
  SIGNIFICATION: "Signification d'un acte de procédure",
  SAISIE: 'Saisie conservatoire de biens meubles',
  AUTRE: 'Dossier divers',
};
const MODES_PAIEMENT = ['ESPECES', 'VIREMENT', 'MOBILE_MONEY'];
const TITRES_EVENEMENT = [
  'Audience au tribunal de grande instance',
  'Rendez-vous avec le débiteur',
  'Constat sur place',
  'Signification à domicile',
  'Relance téléphonique programmée',
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(min + Math.random() * (max - min));
const randMontant = () => Math.round(randInt(150000, 2500000) / 5000) * 5000;
const randPhone = () => `+226 ${randInt(60, 79)} ${String(randInt(0, 99)).padStart(2, '0')} ${String(randInt(0, 99)).padStart(2, '0')} ${String(randInt(0, 99)).padStart(2, '0')}`;
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');

async function main() {
  console.log(`→ Connexion à ${BASE_URL} ...`);
  const { accessToken } = await api('POST', '/auth/login', null, { email: EMAIL, motDePasse: PASSWORD });
  console.log('✓ Connecté.\n');

  // --- Clients --------------------------------------------------------
  const clients = [];
  for (let i = 0; i < NB_CLIENTS; i++) {
    const estHomme = Math.random() > 0.5;
    const prenom = rand(estHomme ? PRENOMS_H : PRENOMS_F);
    const nom = rand(NOMS);
    const payload = {
      nom,
      prenom,
      telephone: randPhone(),
      adresse: `Secteur ${randInt(1, 55)}, ${rand(QUARTIERS)}, Ouagadougou`,
    };
    if (Math.random() > 0.4) payload.email = `${slug(prenom)}.${slug(nom)}${randInt(1, 99)}@example.bf`;
    if (Math.random() > 0.5) payload.nin = String(randInt(100000000000, 999999999999));

    const client = await api('POST', '/clients', accessToken, payload);
    clients.push(client);
    console.log(`✓ Client   : ${nom} ${prenom}`);
  }

  // --- Dossiers ---------------------------------------------------------
  console.log('');
  const dossiers = [];
  for (const client of clients) {
    const nbDossiers = randInt(1, 3);
    for (let j = 0; j < nbDossiers; j++) {
      const type = rand(TYPES_DOSSIER);
      const dossier = await api('POST', '/dossiers', accessToken, {
        type,
        clientId: client.id,
        description: DESCRIPTIONS_TYPE[type],
      });
      dossiers.push(dossier);
      console.log(`✓ Dossier  : ${dossier.numero ?? dossier.id} (${type})`);
    }
  }

  // --- Factures + paiements ---------------------------------------------
  console.log('');
  for (const dossier of dossiers) {
    if (Math.random() > 0.3) {
      const montantTotal = randMontant();
      const dateEcheance = new Date(Date.now() + randInt(5, 45) * 86400000).toISOString();
      const facture = await api('POST', '/factures', accessToken, {
        dossierId: dossier.id,
        montantTotal,
        dateEcheance,
      });
      console.log(`✓ Facture  : ${facture.numero ?? facture.id} — ${montantTotal.toLocaleString('fr-FR')} FCFA`);

      const sort = Math.random();
      if (sort < 0.35) {
        await api('POST', `/factures/${facture.id}/paiements`, accessToken, {
          montant: montantTotal,
          mode: rand(MODES_PAIEMENT),
          reference: `PMT-${randInt(1000, 9999)}`,
        });
        console.log('  ↳ payée intégralement');
      } else if (sort < 0.55) {
        await api('POST', `/factures/${facture.id}/paiements`, accessToken, {
          montant: Math.round(montantTotal * (0.3 + Math.random() * 0.4) / 5000) * 5000,
          mode: rand(MODES_PAIEMENT),
        });
        console.log('  ↳ paiement partiel enregistré');
      }
    }
  }

  // --- Agenda -------------------------------------------------------------
  console.log('');
  for (let i = 0; i < 6; i++) {
    const dossier = rand(dossiers);
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() + randInt(-2, 8));
    dateDebut.setHours(randInt(8, 16), rand([0, 15, 30, 45]), 0, 0);
    await api('POST', '/agenda', accessToken, {
      titre: rand(TITRES_EVENEMENT),
      dossierId: dossier.id,
      dateDebut: dateDebut.toISOString(),
      rappelJ1: true,
    });
    console.log(`✓ Événement : ${dateDebut.toLocaleDateString('fr-FR')} ${dateDebut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
  }

  console.log(`\n🎉 Terminé : ${clients.length} clients, ${dossiers.length} dossiers, factures et rendez-vous créés.`);
  console.log('   Recharge le tableau de bord pour voir les chiffres.');
}

main().catch((e) => {
  console.error('\n❌ Erreur :', e.message);
  process.exit(1);
});
