// Personajes entre los que cada jugador elige su moneda: tres por cada serie de cartas, con el fondo
// del color de la serie. El id es también el nombre de sus imágenes (public/avatares/<id>-<gesto>.webp).
import type { Ambito } from './tipos'

export const SERIES_AVATARES = {
  comunicacion: {
    escritor: 'Escritor del Siglo de Oro',
    monje: 'Monje copista',
    ilustrada: 'Dama ilustrada',
  },
  social: {
    rey: 'Rey',
    soldado: 'Soldado de la II Guerra Mundial',
    faraona: 'Faraona',
  },
  cientifico: {
    cientifica: 'Científica',
    astronomo: 'Astrónomo andalusí',
    astronauta: 'Astronauta',
  },
  mujer: {
    sufragista: 'Sufragista',
    aviadora: 'Aviadora',
    filosofa: 'Filósofa de Alejandría',
  },
  coria: {
    obispo: 'Obispo',
    aldeano: 'Aldeano',
    corredor: 'Corredor de San Juan',
  },
} as const satisfies Record<Ambito, Record<string, string>>

export const AVATARES: Record<string, string> = Object.assign({}, ...Object.values(SERIES_AVATARES))
export const IDS_AVATARES = Object.keys(AVATARES)

export const esAvatar = (s: unknown): s is string => typeof s === 'string' && Object.hasOwn(AVATARES, s)

/** Un avatar que no esté ya cogido (o cualquiera, si no queda ninguno libre). */
export function avatarLibre(usados: (string | undefined)[], azar: () => number = Math.random): string {
  const libres = IDS_AVATARES.filter((a) => !usados.includes(a))
  const entre = libres.length ? libres : IDS_AVATARES
  return entre[Math.floor(azar() * entre.length)]
}
