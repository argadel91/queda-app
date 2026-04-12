const CATEGORIES = [
  { slug: 'cafe',       emoji: '☕', labels: { es: 'Café', en: 'Coffee', pt: 'Café', fr: 'Café', de: 'Kaffee', it: 'Caffè' } },
  { slug: 'food',       emoji: '🍽️', labels: { es: 'Comer', en: 'Food', pt: 'Comida', fr: 'Repas', de: 'Essen', it: 'Cibo' } },
  { slug: 'drinks',     emoji: '🍻', labels: { es: 'Copas', en: 'Drinks', pt: 'Bebidas', fr: 'Verres', de: 'Drinks', it: 'Drink' } },
  { slug: 'sport',      emoji: '⚽', labels: { es: 'Deporte', en: 'Sport', pt: 'Desporto', fr: 'Sport', de: 'Sport', it: 'Sport' } },
  { slug: 'hiking',     emoji: '🥾', labels: { es: 'Senderismo', en: 'Hiking', pt: 'Caminhada', fr: 'Randonnée', de: 'Wandern', it: 'Escursione' } },
  { slug: 'cinema',     emoji: '🎬', labels: { es: 'Cine', en: 'Cinema', pt: 'Cinema', fr: 'Cinéma', de: 'Kino', it: 'Cinema' } },
  { slug: 'culture',    emoji: '🎭', labels: { es: 'Cultura', en: 'Culture', pt: 'Cultura', fr: 'Culture', de: 'Kultur', it: 'Cultura' } },
  { slug: 'music',      emoji: '🎵', labels: { es: 'Música', en: 'Music', pt: 'Música', fr: 'Musique', de: 'Musik', it: 'Musica' } },
  { slug: 'games',      emoji: '🎲', labels: { es: 'Juegos', en: 'Games', pt: 'Jogos', fr: 'Jeux', de: 'Spiele', it: 'Giochi' } },
  { slug: 'study',      emoji: '📚', labels: { es: 'Estudiar', en: 'Study', pt: 'Estudar', fr: 'Étudier', de: 'Lernen', it: 'Studiare' } },
  { slug: 'travel',     emoji: '✈️', labels: { es: 'Viajar', en: 'Travel', pt: 'Viajar', fr: 'Voyager', de: 'Reisen', it: 'Viaggiare' } },
  { slug: 'wellness',   emoji: '🧘', labels: { es: 'Bienestar', en: 'Wellness', pt: 'Bem-estar', fr: 'Bien-être', de: 'Wellness', it: 'Benessere' } },
  { slug: 'shopping',   emoji: '🛍️', labels: { es: 'Compras', en: 'Shopping', pt: 'Compras', fr: 'Shopping', de: 'Shoppen', it: 'Shopping' } },
  { slug: 'volunteer',  emoji: '🤝', labels: { es: 'Voluntariado', en: 'Volunteer', pt: 'Voluntariado', fr: 'Bénévolat', de: 'Ehrenamt', it: 'Volontariato' } },
  { slug: 'languages',  emoji: '🗣️', labels: { es: 'Idiomas', en: 'Languages', pt: 'Idiomas', fr: 'Langues', de: 'Sprachen', it: 'Lingue' } },
  { slug: 'other',      emoji: '✨', labels: { es: 'Otro', en: 'Other', pt: 'Outro', fr: 'Autre', de: 'Andere', it: 'Altro' } },
]

export default CATEGORIES

export const getCategoryBySlug = slug => CATEGORIES.find(cat => cat.slug === slug)
export const getCategoryLabel = (slug, lang) => {
  const cat = getCategoryBySlug(slug)
  return cat ? cat.labels[lang] || cat.labels.en : slug
}
export const getCategoryEmoji = slug => {
  const cat = getCategoryBySlug(slug)
  return cat ? cat.emoji : '✨'
}
