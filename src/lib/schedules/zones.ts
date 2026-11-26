// Indonesia's three time zones, and a best guess of a customer's zone from the
// free-text leads.location. No server-only imports: the UI may use the labels.
// None of the three has daylight saving, so each is a fixed UTC offset.

export const TIME_ZONES = {
  "Asia/Jakarta": {
    short: "WIB",
    long: "Western Indonesia Time",
    longId: "Waktu Indonesia Barat",
    utc: "UTC+7",
    offset: "+07:00",
  },
  "Asia/Makassar": {
    short: "WITA",
    long: "Central Indonesia Time",
    longId: "Waktu Indonesia Tengah",
    utc: "UTC+8",
    offset: "+08:00",
  },
  "Asia/Jayapura": {
    short: "WIT",
    long: "Eastern Indonesia Time",
    longId: "Waktu Indonesia Timur",
    utc: "UTC+9",
    offset: "+09:00",
  },
} as const

export type TimeZoneId = keyof typeof TIME_ZONES
export type ZoneLabel = (typeof TIME_ZONES)[TimeZoneId]["short"]

/** In west-to-east order, for pickers. */
export const TIME_ZONE_IDS = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"] as const satisfies readonly TimeZoneId[]

/** FSI's office is in Bali: staff views group by this zone's days. */
export const OFFICE_TIME_ZONE: TimeZoneId = "Asia/Makassar"

/** Used when a customer's location says nothing usable (FSI is in Bali). */
export const DEFAULT_TIME_ZONE: TimeZoneId = OFFICE_TIME_ZONE

export function isTimeZone(value: unknown): value is TimeZoneId {
  return typeof value === "string" && Object.hasOwn(TIME_ZONES, value)
}

/** "WIB", "WITA" or "WIT". */
export function zoneLabel(zone: TimeZoneId): ZoneLabel {
  return TIME_ZONES[zone].short
}

/** "WIB (Western Indonesia Time, UTC+7)" */
export function zoneDescription(zone: TimeZoneId) {
  const z = TIME_ZONES[zone]
  return `${z.short} (${z.long}, ${z.utc})`
}

// ------------------------------------------------------------------ location

const WIB: readonly string[] = [
  // DKI Jakarta and Banten
  "jakarta", "djakarta", "jkt", "dki", "jabodetabek", "jaksel", "jakbar", "jaktim", "jakut", "jakpus",
  "banten", "tangerang", "tangsel", "bsd", "serang", "cilegon", "pandeglang", "lebak",
  // West Java
  "jawa barat", "jabar", "bandung", "bogor", "depok", "bekasi", "karawang", "purwakarta", "subang", "sukabumi",
  "cianjur", "garut", "tasikmalaya", "cirebon", "indramayu", "kuningan", "majalengka", "sumedang", "ciamis",
  "pangandaran", "cimahi",
  // Central Java and Yogyakarta
  "jawa tengah", "jateng", "semarang", "solo", "surakarta", "pekalongan", "tegal", "brebes", "banyumas",
  "purwokerto", "cilacap", "magelang", "salatiga", "kudus", "jepara", "pati", "rembang", "blora", "klaten",
  "boyolali", "sukoharjo", "wonogiri", "karanganyar", "sragen", "kebumen", "purworejo", "wonosobo", "dieng",
  "temanggung", "kendal", "batang", "pemalang", "demak", "grobogan", "banjarnegara", "purbalingga",
  "yogyakarta", "yogya", "jogja", "jogjakarta", "jogya", "diy", "sleman", "bantul", "gunungkidul", "kulon progo",
  // East Java
  "jawa timur", "jatim", "surabaya", "sidoarjo", "gresik", "malang", "kediri", "blitar", "madiun",
  "ponorogo", "pacitan", "tulungagung", "trenggalek", "jombang", "mojokerto", "pasuruan", "probolinggo",
  "lumajang", "jember", "bondowoso", "situbondo", "banyuwangi", "lamongan", "tuban", "bojonegoro", "ngawi",
  "magetan", "nganjuk", "madura", "bangkalan", "sampang", "pamekasan", "sumenep", "bromo",
  "jawa", "java",
  // Sumatra and islands
  "sumatra", "sumatera", "aceh", "banda aceh", "lhokseumawe", "sabang",
  "sumatera utara", "sumatra utara", "sumut", "medan", "binjai", "pematangsiantar", "siantar", "tebing tinggi",
  "sibolga", "nias", "toba", "samosir", "berastagi",
  "sumatera barat", "sumatra barat", "sumbar", "padang", "bukittinggi", "payakumbuh", "mentawai",
  "riau", "pekanbaru", "dumai", "duri", "siak", "bengkalis", "rokan",
  "kepulauan riau", "kepri", "batam", "bintan", "tanjung pinang", "tanjungpinang", "karimun", "natuna",
  "jambi", "bengkulu",
  "sumatera selatan", "sumatra selatan", "sumsel", "palembang", "prabumulih", "lubuklinggau", "lahat",
  "muara enim", "tanjung enim", "baturaja",
  "bangka", "belitung", "pangkal pinang", "pangkalpinang",
  "lampung", "bandar lampung", "bandarlampung",
  // West and Central Kalimantan
  "kalimantan barat", "kalbar", "pontianak", "singkawang", "ketapang", "sambas", "sintang",
  "kalimantan tengah", "kalteng", "palangkaraya", "palangka raya", "sampit", "pangkalan bun",
]

const WITA: readonly string[] = [
  // Bali
  "bali", "denpasar", "badung", "gianyar", "tabanan", "bangli", "klungkung", "karangasem", "buleleng",
  "jembrana", "singaraja", "kuta", "legian", "seminyak", "kerobokan", "canggu", "berawa",
  "pererenan", "umalas", "sanur", "nusa dua", "jimbaran", "uluwatu", "pecatu", "ungasan",
  "ubud", "tegallalang", "amed", "candidasa", "lovina", "munduk", "bedugul", "tanah lot", "kintamani",
  "nusa penida", "penida", "nusa lembongan", "lembongan", "nusa lembogan", "lembogan", "nusa ceningan", "ceningan",
  // NTB (Lombok, Gili, Sumbawa)
  "nusa tenggara barat", "ntb", "lombok", "mataram", "senggigi", "mandalika", "kuta mandalika", "kuta lombok",
  "praya", "selong", "gili", "gili trawangan", "gili air", "gili meno", "gili gede", "sekotong",
  "sumbawa", "bima", "dompu",
  // NTT (Flores, Komodo, Sumba, Timor)
  "nusa tenggara timur", "ntt", "kupang", "flores", "labuan bajo", "labuanbajo", "komodo", "ende", "maumere",
  "sumba", "waingapu", "alor", "rote", "timor", "atambua",
  // Sulawesi
  "sulawesi", "celebes", "sulawesi selatan", "sulsel", "makassar", "makasar", "ujung pandang", "gowa", "maros",
  "parepare", "pare pare", "bulukumba", "toraja", "palopo", "sulawesi barat", "sulbar", "mamuju",
  "sulawesi tengah", "sulteng", "palu", "luwuk", "poso", "sulawesi tenggara", "sultra", "kendari", "baubau",
  "sulawesi utara", "sulut", "manado", "menado", "bitung", "tomohon", "minahasa", "bunaken",
  "gorontalo",
  // South, East and North Kalimantan
  "kalimantan selatan", "kalsel", "banjarmasin", "banjarbaru", "martapura", "kotabaru", "tanah bumbu",
  "kalimantan timur", "kaltim", "balikpapan", "samarinda", "bontang", "sangatta", "kutai", "tenggarong",
  "paser", "tanah grogot", "penajam", "ikn", "berau", "tanjung redeb", "tanjungredeb",
  "kalimantan utara", "kaltara", "tarakan", "nunukan", "malinau", "tanjung selor",
]

const WIT: readonly string[] = [
  // Maluku
  "maluku", "maluku utara", "malut", "ambon", "ternate", "tidore", "sofifi", "halmahera", "tual", "kei",
  "saumlaki", "masohi", "banda neira",
  // Papua
  "papua", "irian", "papua barat", "papua barat daya", "papua tengah", "papua pegunungan", "papua selatan",
  "jayapura", "sentani", "merauke", "timika", "mimika", "nduga", "wamena", "jayawijaya", "nabire", "biak",
  "serui", "yapen", "asmat", "boven digoel", "yahukimo", "puncak jaya", "paniai", "keerom", "sarmi",
  "sorong", "raja ampat", "waisai", "manokwari", "fakfak", "kaimana", "bintuni", "teluk bintuni",
]

function normalize(text: string) {
  return ` ${text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `
}

type Keyword = { phrase: string; zone: TimeZoneId }

const KEYWORDS: readonly Keyword[] = [
  ...WIB.map((phrase) => ({ phrase, zone: "Asia/Jakarta" as const })),
  ...WITA.map((phrase) => ({ phrase, zone: "Asia/Makassar" as const })),
  ...WIT.map((phrase) => ({ phrase, zone: "Asia/Jayapura" as const })),
].map((keyword) => ({ ...keyword, phrase: normalize(keyword.phrase) }))

export type ZoneMatch = {
  zone: TimeZoneId
  /** True when the text names places in one zone only. */
  confident: boolean
  /** The first place recognised, as written in the keyword table. */
  matched?: string
}

/**
 * The customer's time zone from free text such as leads.location. Matches
 * whole words, ignoring case and punctuation ("Bali + Lombok", "nduga, papua
 * pegunungan"). Places in one zone: that zone, confident. Places in several
 * zones ("jakarta, bali"): the first place's zone, not confident. Nothing
 * recognised (empty, "-", "zen villa"): Asia/Makassar, not confident.
 */
export function zoneForLocation(text: string | null | undefined): ZoneMatch {
  const haystack = normalize(text ?? "")
  const hits: Array<Keyword & { at: number }> = []
  for (const keyword of KEYWORDS) {
    const at = haystack.indexOf(keyword.phrase)
    if (at >= 0) hits.push({ ...keyword, at })
  }
  if (hits.length === 0) return { zone: DEFAULT_TIME_ZONE, confident: false }

  // Earliest place first; at the same position the longest phrase wins ("kuta mandalika" over "kuta").
  hits.sort((a, b) => a.at - b.at || b.phrase.length - a.phrase.length)
  const first = hits[0]
  const zones = new Set(hits.map((hit) => hit.zone))
  return { zone: first.zone, confident: zones.size === 1, matched: first.phrase.trim() }
}
