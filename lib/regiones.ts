export type Region = {
  id: string
  nombre: string
  fuente: string
  disabled: boolean
}

export const REGIONES: Region[] = [
  { id: 'andalucia',          nombre: 'Andalucía',             fuente: 'BOJA',          disabled: false },
  { id: 'aragon',             nombre: 'Aragón',                fuente: 'BOA',           disabled: true  },
  { id: 'asturias',           nombre: 'Asturias',              fuente: 'BOPA',          disabled: false },
  { id: 'baleares',           nombre: 'Islas Baleares',        fuente: 'BOIB',          disabled: false },
  { id: 'canarias',           nombre: 'Canarias',              fuente: 'BOC_CANARIAS',  disabled: false },
  { id: 'cantabria',          nombre: 'Cantabria',             fuente: 'BOC_CANTABRIA', disabled: false },
  { id: 'castilla-la-mancha', nombre: 'Castilla-La Mancha',    fuente: 'DOCM',          disabled: true  },
  { id: 'castilla-y-leon',    nombre: 'Castilla y León',       fuente: 'BOCYL',         disabled: false },
  { id: 'cataluna',           nombre: 'Cataluña',              fuente: 'DOGC',          disabled: false },
  { id: 'extremadura',        nombre: 'Extremadura',           fuente: 'DOE',           disabled: false },
  { id: 'galicia',            nombre: 'Galicia',               fuente: 'DOG',           disabled: false },
  { id: 'la-rioja',           nombre: 'La Rioja',              fuente: 'BOR',           disabled: false },
  { id: 'madrid',             nombre: 'Comunidad de Madrid',   fuente: 'BOCM',          disabled: false },
  { id: 'murcia',             nombre: 'Murcia',                fuente: 'BORM',          disabled: false },
  { id: 'navarra',            nombre: 'Navarra',               fuente: 'BON',           disabled: false },
  { id: 'pais-vasco',         nombre: 'País Vasco',            fuente: 'BOPV',          disabled: false },
  { id: 'valencia',           nombre: 'Comunitat Valenciana',  fuente: 'DOGV',          disabled: true  },
]
