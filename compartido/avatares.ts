// Personajes entre los que cada jugador elige su moneda. El id es también el nombre de sus imágenes
// (public/avatares/<id>-<gesto>.webp).

export const AVATARES = {
  escritor: 'Escritor del Siglo de Oro',
  montehermoso: 'Mujer de Montehermoso',
  cientifica: 'Científica',
  rey: 'Rey',
  indigena: 'Señor mexica',
  filosofa: 'Filósofa de Alejandría',
  monje: 'Monje copista',
  navegante: 'Navegante',
  sufragista: 'Sufragista',
  astronomo: 'Astrónomo andalusí',
  faraona: 'Faraona',
  legionario: 'Legionario romano',
  ilustrada: 'Dama ilustrada',
  astronauta: 'Astronauta',
} as const

export type Avatar = keyof typeof AVATARES
export const IDS_AVATARES = Object.keys(AVATARES) as Avatar[]

export const esAvatar = (s: unknown): s is Avatar => typeof s === 'string' && s in AVATARES

/** Un avatar que no esté ya cogido (o cualquiera, si no queda ninguno libre). */
export function avatarLibre(usados: (string | undefined)[], azar: () => number = Math.random): Avatar {
  const libres = IDS_AVATARES.filter((a) => !usados.includes(a))
  const entre = libres.length ? libres : IDS_AVATARES
  return entre[Math.floor(azar() * entre.length)]
}
