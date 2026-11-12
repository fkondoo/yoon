/* data.js – Données de Yoon
   Tout est original et sans droit d'auteur : artistes fictifs, pochettes (assets/covers) et instrumentaux (assets/audio) générés pour le projet. */
const countries = ['Sénégal', "Côte d'Ivoire", 'Nigeria', 'RDC', 'Mali', 'Guinée', 'Cameroun', 'Ghana'];
const styles = ['Rap Galsen', 'Drill', 'Trap', 'Boom Bap', 'Afro-trap', 'Conscient', 'Freestyle'];

// Image de pochette : cover('song', 3) -> assets/covers/song-3.svg  (types : song, album, rapper)
const cover = (kind, n) => `url('assets/covers/${kind}-${n}.svg') center/cover no-repeat`;

/* ===== RAPPEURS ===== */
const rapperData = [
  ['Baay Fall Jr', 'Sénégal'], ['Nana Blaze', "Côte d'Ivoire"], ['Ade Kunle', 'Nigeria'],
  ['Mpongo Kin', 'RDC'], ['Sira Beat', 'Mali'], ['Kerfala MC', 'Guinée'],
  ['Ebene Mbia', 'Cameroun'], ['Kofi Rhyme', 'Ghana'], ['Awa Slam', 'Sénégal'], ['Zeze Drill', "Côte d'Ivoire"]
];
const rappers = rapperData.map(([name, country], i) => ({ id: i + 1, name, country, cover: cover('rapper', i + 1) }));

/* ===== ALBUMS ===== */
const albumTitles = ['Terre Rouge', 'Dakar Midnight', 'Lagos Smoke', 'Fleuve Noir', 'Griot 2.0', 'Soleil de Plomb', 'Bitume Doré', 'Racines'];
const albums = albumTitles.map((title, i) => ({ id: i + 1, title, artist: rappers[i].name, cover: cover('album', i + 1) }));

/* ===== MORCEAUX (24) : chacun a sa pochette et son fichier audio ===== */
const titles = ['Sunu Gaal', 'Nuit de Hann', 'Lagos Lights', 'Kin la Belle', 'Sahel Flow', 'Coupé Décalé Drill',
  'Mboa Cypher', 'Accra Rain', 'Teranga Vibes', 'Bitume', 'Dalal Jàmm', 'Cargo Doré', 'Ndar Nights', 'Rue Cases',
  'Mic Check Kinshasa', 'Harmattan', 'Gold Chain', 'Yaw Mbëkk', 'Quartier Zéro', 'Griot Moderne', 'Dem ak Dellu',
  'Afro Bars #1', 'Lion de Cuivre', 'Sans Filtre'];

const songs = titles.map((title, i) => {
  const r = rappers[i % 10];
  return {
    id: i + 1, title, artist: r.name, country: r.country, style: styles[i % 7],
    album: i % 10 < 8 ? albums[i % 10].title : 'Single',
    duration: 36 + ((i * 5) % 13),           // durée réelle des instrumentaux (corrigée automatiquement à la lecture)
    cover: cover('song', i + 1),
    audio: `assets/audio/${i + 1}.mp3`,
    lyrics: ['Yo, c’est Yoon, on lève le son,', 'Du Sahel à la côte, on garde le ton,',
      'Chaque rime est une route, chaque beat un frère,', 'Le rap afro, sans filtre, sans frontière.']
  };
});

/* ===== PLAYLISTS ===== */
const idsOf = fn => songs.filter(fn).map(s => s.id);
const playlists = [
  { id: 1, name: 'Rap Galsen 100%', description: 'Le meilleur du rap sénégalais.', songIds: idsOf(s => s.style === 'Rap Galsen') },
  { id: 2, name: 'Drill Abidjan', description: 'Drill et énergie ivoirienne.', songIds: idsOf(s => s.style === 'Drill') },
  { id: 3, name: 'Freestyles du mois', description: 'Cyphers et freestyles frais.', songIds: idsOf(s => s.style === 'Freestyle') },
  { id: 4, name: 'Gym Mode', description: 'Trap et afro-trap pour pousser plus fort.', songIds: idsOf(s => ['Trap', 'Afro-trap'].includes(s.style)) },
  { id: 5, name: 'Late Night Flow', description: 'Boom bap et rap conscient pour la nuit.', songIds: idsOf(s => ['Boom Bap', 'Conscient'].includes(s.style)) }
];
