/** Minimise obvious identifiers; this is not a guarantee of anonymisation. */
export function minimiseAiText(text:string){return text.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,"[email dihapus]").replace(/(?<!\d)(?:\+?62|0)\d[\d\s()-]{7,16}\d(?!\d)/g,"[nomor dihapus]").replace(/\b\d{16}\b/g,"[identitas dihapus]");}
export function reviewedAiProvider(provider:string){return !!process.env.AI_TRANSFER_REVIEW_REF && (process.env.AI_APPROVED_PROVIDERS||"").split(",").map(s=>s.trim()).includes(provider);}
