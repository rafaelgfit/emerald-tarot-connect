// Máscaras e helpers de formatação

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function maskDate(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export function maskTime(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

// "dd/MM/yyyy" -> "yyyy-MM-dd"
export function brDateToIso(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// "yyyy-MM-dd" -> "dd/MM/yyyy"
export function isoDateToBr(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// "HH:mm" garante 5 chars
export function normalizeTime(value: string): string | null {
  const m = value.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return `${m[1]}:${m[2]}`;
}

const DIAS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function diaDaSemana(isoDate: string): string {
  if (!isoDate) return "";
  // construir local-date para evitar timezone shift
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(y, m - 1, d);
  return DIAS[date.getDay()];
}

export function calcularSigno(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const [, mm, dd] = isoDate.split("-").map(Number);
  if (!mm || !dd) return "";
  const md = mm * 100 + dd;
  if (md >= 321 && md <= 419) return "Áries";
  if (md >= 420 && md <= 520) return "Touro";
  if (md >= 521 && md <= 620) return "Gêmeos";
  if (md >= 621 && md <= 722) return "Câncer";
  if (md >= 723 && md <= 822) return "Leão";
  if (md >= 823 && md <= 922) return "Virgem";
  if (md >= 923 && md <= 1022) return "Libra";
  if (md >= 1023 && md <= 1121) return "Escorpião";
  if (md >= 1122 && md <= 1221) return "Sagitário";
  if (md >= 1222 || md <= 119) return "Capricórnio";
  if (md >= 120 && md <= 218) return "Aquário";
  return "Peixes";
}

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function whatsappLink(phone: string, text: string): string {
  const digits = onlyDigits(phone);
  // BR default: prefix 55 se faltar
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

// Verifica sobreposição de horários
export function intervalosSobrepoem(
  aStart: Date,
  aDur: number,
  bStart: Date,
  bDur: number,
): boolean {
  const aEnd = new Date(aStart.getTime() + aDur * 60000);
  const bEnd = new Date(bStart.getTime() + bDur * 60000);
  return aStart < bEnd && bStart < aEnd;
}

export function buildDateTime(isoDate: string, hhmm: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0, 0, 0);
}