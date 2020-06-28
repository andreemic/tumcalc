export interface Class {
  name: string,
  factor?: number,
  critical?: boolean  // true if you can't pass without
}

export interface Subject {
  name: string,
  classes: Class[],
  passingScore?: number,
  src?: string,         // link to page with pdf download
  pdfSrc?: string       // download link for pdf
};

export const subjects = [
  {
    name: 'Mathematik',
    classes: [
      { name: 'Mathematik', factor: 4, critical: true}, 
      { name: 'Deutsch', factor: 1 , critical: true},
      { name: 'Physik', factor: 2 }
    ],
    passingScore: 80,
    pdfSrc: 'https://portal.mytum.de/archiv/kompendium_rechtsangelegenheiten/eignungsfeststellungssatzungen/2010-10-EFV-Satzg-BA-Informatik-FINAL-1-04-10.pdf/download',
    src: 'https://portal.mytum.de/archiv/kompendium_rechtsangelegenheiten/eignungsfeststellungssatzungen/2010-11-EfV-Satzg-BA-Mathe-FINAL-1-04-10.pdf/view'
  },
  {
    name: 'Informatik',
    classes: [
      { name: 'Mathematik', factor: 3 }, 
      { name: 'Deutsch', factor: 2 },
      { name: 'Englisch', factor: 1 },
      { name: '2. Naturwiss.', factor: 1 } 
    ],
    passingScore: 73,
    pdfSrc: 'https://portal.mytum.de/archiv/kompendium_rechtsangelegenheiten/eignungsfeststellungssatzungen/2010-10-EFV-Satzg-BA-Informatik-FINAL-1-04-10.pdf/download',
    src: 'https://www.in.tum.de/fuer-studieninteressierte/bewerbung/bachelor-informatik/'
  },
  {
    name: 'Architektur',
    classes: [
      { name: 'Mathematik', factor: 2 }, 
      { name: 'Deutsch', factor: 1 },
      { name: 'Englisch', factor: 1 },
      { name: 'Kunst', factor: 3, critical: true } 
    ],
    passingScore: 80,
    pdfSrc: 'https://portal.mytum.de/archiv/kompendium_rechtsangelegenheiten/eignungsfeststellungssatzungen/2009-45-EfV-Satzung-BA-Architektur-FINAL-30-4-09.pdf/download',
    src: 'https://portal.mytum.de/archiv/kompendium_rechtsangelegenheiten/eignungsfeststellungssatzungen/2009-45-EfV-Satzung-BA-Architektur-FINAL-30-4-09.pdf/view'
  }
];

