// Legierungen = Verzauberungen. Eine pro Raum.
export const ALLOYS = {
  gold: { id: 'gold', name: 'Gold', text: 'Löst zweimal aus', times: 2 },
  silber: { id: 'silber', name: 'Silber', text: 'Gibt bei Auslösung zusätzlich 3 Schild je Etage', shieldPerFloor: 3 },
  quecksilber: { id: 'quecksilber', name: 'Quecksilber', text: 'Der Funke durchquert den Raum doppelt so schnell', costMult: 0.5 },
  kupfer: { id: 'kupfer', name: 'Kupfer', text: 'Löst auch den Raum darunter aus', conduct: true },
  rost: { id: 'rost', name: 'Rost', text: 'Doppelte Wirkung, verfällt nach 6 Auslösungen', mult: 2, breaksAfter: 6 },
  glas: { id: 'glas', name: 'Glas', text: 'Dreifache Wirkung, zerbricht beim ersten Treffer auf die Integrität', mult: 3, glass: true },
};
export const ALLOY_IDS = Object.keys(ALLOYS);
