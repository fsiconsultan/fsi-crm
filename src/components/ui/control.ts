import { inputClass } from "./field"

// Inputs and selects at 16px on phones: iOS Safari zooms the page when a
// focused field has smaller text. Desktop keeps the 14px body size.
export const controlClass = `${inputClass} max-md:text-base`
