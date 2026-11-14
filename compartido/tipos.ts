export type Ambito = 'comunicacion' | 'social' | 'cientifico' | 'mujer' | 'coria'
export type Era = 'antigua' | 'media' | 'moderna' | 'contemporanea'
export type Esquina = 'tl' | 'tr' | 'bl' | 'br'

/** Lo que el jugador puede ver de una carta antes de jugarla: nunca incluye el año. */
export interface Carta {
  id: string
  texto: string
  ambito: Ambito
  logoAnverso: Esquina
  logoReverso: Esquina
  credito: string
}

/** El dato que se descubre al voltear la carta. */
export interface Fecha {
  anio: number
  circa: boolean
}

export const AMBITOS: Record<Ambito, string> = {
  comunicacion: 'Comunicación',
  social: 'Social',
  cientifico: 'Científico',
  mujer: 'Mujer y género',
  coria: 'Coria',
}

export function eraDe(anio: number): Era {
  return anio <= 499 ? 'antigua' : anio <= 1499 ? 'media' : anio <= 1799 ? 'moderna' : 'contemporanea'
}
