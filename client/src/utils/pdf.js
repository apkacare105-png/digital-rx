// Makes an A4 PDF of the prescription sheet in the browser (nothing is generated or stored on the server).
// The libraries are large, so they are only loaded when a doctor actually taps Download or Share.
// html2canvas-pro is used because Tailwind v4 colours (oklch) are not understood by the original html2canvas.

const PAGE_W = 210, PAGE_H = 297; // A4, mm
const MARGIN = { top: 8, bottom: 10, side: 8 };

/** Page-break candidates (px from the top of the sheet): bottom of each table row, top of each keep-together block. */
function breakPoints(el) {
  const top = el.getBoundingClientRect().top;
  const pts = [];
  el.querySelectorAll('tr').forEach((r) => pts.push(r.getBoundingClientRect().bottom - top));
  el.querySelectorAll('.keep-together').forEach((r) => pts.push(r.getBoundingClientRect().top - top));
  return pts.sort((a, b) => a - b);
}

export async function sheetToPdfBlob(element) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
  const SCALE = 2;
  const canvas = await html2canvas(element, { scale: SCALE, useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (doc) => {
      // flat page: no card border / shadow / rounded corners in the PDF
      doc.querySelectorAll('.print-sheet').forEach((n) => {
        n.style.border = 'none';
        n.style.boxShadow = 'none';
        n.style.borderRadius = '0';
      });
    },
  });

  const cssW = element.getBoundingClientRect().width;
  const cssH = canvas.height / SCALE;
  const contentW = PAGE_W - MARGIN.side * 2; // mm
  const pxPerMm = cssW / contentW;
  const pageHpx = (PAGE_H - MARGIN.top - MARGIN.bottom) * pxPerMm; // CSS px that fit on one page
  const points = breakPoints(element);

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  let start = 0;
  let first = true;
  while (start < cssH - 1) {
    let end = Math.min(start + pageHpx, cssH);
    if (end < cssH) {
      // end the page on the last row boundary that still fits, so no row is cut in half
      const fit = points.filter((p) => p > start + pageHpx * 0.3 && p <= end);
      if (fit.length) end = fit[fit.length - 1];
    }
    const sliceH = end - start;
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = Math.max(1, Math.round(sliceH * SCALE));
    const ctx = slice.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, Math.round(start * SCALE), canvas.width, slice.height, 0, 0, canvas.width, slice.height);
    if (!first) pdf.addPage();
    first = false;
    pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', MARGIN.side, MARGIN.top, contentW, sliceH / pxPerMm);
    start = end;
  }
  return pdf.output('blob');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
