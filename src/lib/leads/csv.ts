// CSV for spreadsheet apps (RFC 4180): every cell quoted, quotes doubled,
// CRLF line ends. A cell that a spreadsheet would run as a formula (=, @, a tab,
// or + or - not followed by a digit) gets a leading apostrophe; phone numbers
// such as +62 812 stay as written.
const FORMULA_START = /^(?:[=@\t\r]|[+-](?!\d))/

function cell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value)
  const safe = FORMULA_START.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

export function toCsv(header: string[], rows: Array<Array<string | number | null | undefined>>) {
  return [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n"
}
