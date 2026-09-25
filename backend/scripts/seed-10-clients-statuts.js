// seed-10-clients-statuts.js
//
// Crée (au moins) 10 clients de test avec des statuts variés (ACTIF, SOLDE,
// INSOLVABLE), pour tester en conditions réelles filtres, badges de couleur
// et export CSV. Passe par l'API réelle (POST /clients puis PATCH /clients/:id
// pour forcer le statut), donc respecte les règles métier existantes.
//
// UTILISATION (PowerShell, depuis le dossier backend) :
//
//   $env:SEED_EMAIL    = "ton-email-de-connexion@ex.com"
//   $env:SEED_PASSWORD = "ton-mot-de-passe"
//   node scripts\seed-10-clients-statuts.js
//
// Optionnel :
//   $env:SEED_BASE_URL = "http://test2.localhost:3000/api"   (valeur par défaut)

const BASE_URL = process.env.SEED_BASE_URL || 'http://test2.localhost:3000/api';
const EMAIL = process.env.SEED_EMAIL;
const PASSWORD = process.env.SEED_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('❌ Définis $env:SEED_EMAIL et $env:SEED_PASSWORD avant de lancer ce script.');
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

const PRENOMS_H = ['Issa', 'Boureima', 'Moussa', 'Rasmané', 'Adama', 'Salif', 'Ousmane', 'Idrissa'];
const PRENOMS_F = ['Aïssata', 'Fatimata', 'Awa', 'Mariam', 'Rasmata', 'Salamata', 'Kadiatou', 'Bintou'];
const NOMS = ['Ouédraogo', 'Compaoré', 'Sawadogo', 'Kaboré', 'Zongo', 'Traoré', 'Nikiéma', 'Sanou', 'Ilboudo', 'Sana'];
const QUARTIERS = ['Gounghin', 'Tanghin', 'Cissin', 'Wemtenga', 'Somgandé', 'Pissy', 'Dassasgho', 'Zogona'];

// Répartition volontairement variée pour tester les filtres/couleurs par statut.
const STATUTS = ['ACTIF', 'ACTIF', 'ACTIF', 'ACTIF', 'SOLDE', 'SOLDE', 'SOLDE', 'INSOLVABLE', 'INSOLVABLE', 'INSOLVABLE'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(min + Math.random() * (max - min));
const randPhone = () => `+226 ${randInt(60, 79)} ${String(randInt(0, 99)).padStart(2, '0')} ${String(randInt(0, 99)).padStart(2, '0')} ${String(randInt(0, 99)).padStart(2, '0')}`;
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');

async function main() {
  console.log(`→ Connexion à ${BASE_URL} ...`);
  const { accessToken } = await api('POST', '/auth/login', null, { email: EMAIL, motDePasse: PASSWORD });
  console.log('✓ Connecté.\n');

  const nomsUtilises = new Set();

  for (let i = 0; i < STATUTS.length; i++) {
    const estHomme = Math.random() > 0.5;
    const prenom = rand(estHomme ? PRENOMS_H : PRENOMS_F);
    let nom = rand(NOMS);
    // Évite les doublons stricts nom+prénom pour des fiches plus lisibles.
    let cle = `${nom}-${prenom}`;
    let tentatives = 0;
    while (nomsUtilises.has(cle) && tentatives < 10) {
      nom = rand(NOMS);
      cle = `${nom}-${prenom}`;
      tentatives++;
    }
    nomsUtilises.add(cle);

    const statutCible = STATUTS[i];
    const payload = {
      nom,
      prenom,
      telephone: randPhone(),
      adresse: `Secteur ${randInt(1, 55)}, ${rand(QUARTIERS)}, Ouagadougou`,
      email: `${slug(prenom)}.${slug(nom)}${randInt(1, 99)}@example.bf`,
      nin: String(randInt(100000000000, 999999999999)),
    };

    const client = await api('POST', '/clients', accessToken, payload);

    if (statutCible !== 'ACTIF') {
      await api('PATCH', `/clients/${client.id}`, accessToken, { statut: statutCible });
    }

    console.log(`✓ Client ${String(i + 1).padStart(2, '0')}/10 : ${nom} ${prenom} — statut ${statutCible}`);
  }

  console.log('\n🎉 Terminé : 10 clients créés (4 Actif, 3 Soldé, 3 Insolvable).');
  console.log('   Recharge la page Clients / Débiteurs pour les voir apparaître.');
}

main().catch((e) => {
  console.error('\n❌ Erreur :', e.message);
  process.exit(1);
});