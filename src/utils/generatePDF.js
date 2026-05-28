import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

export const generatePDF = async (elementId) => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id ${elementId} not found.`);
  }

  try {
    const imgData = await toJpeg(element, {
      quality: 0.95,
      pixelRatio: 2,
      style: {
        // html-to-image might capture the exact style applied, 
        // resetting transform helps avoid offset issues.
        transform: 'none'
      }
    });

    const elWidth = element.offsetWidth;
    const elHeight = element.scrollHeight;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (elHeight * pdfWidth) / elWidth;
    
    let heightLeft = pdfHeight;
    let position = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    return pdf;
  } catch (error) {
    console.error('Error generating PDF', error);
    throw error;
  }
};
