import jsPDF from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import type { ProjectMetadata } from '@/hooks/useProjectMetadata';

interface ExportPartitionPdfOptions {
  svgElement: SVGSVGElement;
  metadata: ProjectMetadata;
}

const MARGIN_PT = 36;
const HEADER_HEIGHT_PT = 60;

function sanitizeFilename(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'partition';
  return trimmed
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

export async function exportPartitionToPdf({
  svgElement,
  metadata,
}: ExportPartitionPdfOptions): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - MARGIN_PT * 2;

  const title = metadata.name.trim() || 'Sans titre';
  const author = metadata.author.trim();
  const instrument = metadata.instrument.trim();

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(20, 20, 20);
  pdf.text(title, MARGIN_PT, MARGIN_PT + 6);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(90, 90, 90);

  const metaParts: string[] = [];
  if (author) metaParts.push(`Auteur : ${author}`);
  if (instrument) metaParts.push(`Instrument : ${instrument}`);
  if (metaParts.length > 0) {
    pdf.text(metaParts.join('   •   '), MARGIN_PT, MARGIN_PT + 24);
  }

  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.5);
  pdf.line(
    MARGIN_PT,
    MARGIN_PT + HEADER_HEIGHT_PT - 12,
    pageWidth - MARGIN_PT,
    MARGIN_PT + HEADER_HEIGHT_PT - 12,
  );

  // Clone the SVG so we can safely tweak attributes without touching the live one.
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
  const rawWidth =
    Number(svgClone.getAttribute('width')) ||
    svgElement.viewBox.baseVal.width ||
    svgElement.getBoundingClientRect().width ||
    800;
  const rawHeight =
    Number(svgClone.getAttribute('height')) ||
    svgElement.viewBox.baseVal.height ||
    svgElement.getBoundingClientRect().height ||
    220;

  if (!svgClone.getAttribute('viewBox')) {
    svgClone.setAttribute('viewBox', `0 0 ${rawWidth} ${rawHeight}`);
  }

  const targetWidth = usableWidth;
  const scale = targetWidth / rawWidth;
  const usableHeight = pageHeight - (MARGIN_PT + HEADER_HEIGHT_PT) - MARGIN_PT;
  const targetHeight = Math.min(rawHeight * scale, usableHeight);

  // svg2pdf needs the SVG attached to the DOM to compute styles; mount it offscreen.
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.style.pointerEvents = 'none';
  svgClone.setAttribute('width', String(rawWidth));
  svgClone.setAttribute('height', String(rawHeight));
  host.appendChild(svgClone);
  document.body.appendChild(host);

  try {
    await svg2pdf(svgClone, pdf, {
      x: MARGIN_PT,
      y: MARGIN_PT + HEADER_HEIGHT_PT,
      width: targetWidth,
      height: targetHeight,
    });
  } finally {
    document.body.removeChild(host);
  }

  pdf.save(`${sanitizeFilename(metadata.name)}.pdf`);
}
