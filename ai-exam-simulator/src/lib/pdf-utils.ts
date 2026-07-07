export function pdfPageLabel(pages: number[]): string {
  return pages.length ? `PDF ${pages.join(", ")}` : "PDF页码待校对";
}
