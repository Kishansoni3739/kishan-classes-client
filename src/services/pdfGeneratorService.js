import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { fileStorageService } from "./fileStorageService.js";
import { historyService } from "./historyService.js";

/**
 * Capture an HTML DOM element and generate a downloadable/saveable PDF file locally.
 */
export const generateAndSavePdf = async ({ element, filename, title, triggerNotification }) => {
  if (!element) {
    throw new Error("Target print report element not found.");
  }

  // 1. Render DOM element to Canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: 1200,
  });

  // 2. Convert Canvas to A4 PDF using jsPDF
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = pdfHeight;
  let position = 0;
  const pageHeight = pdf.internal.pageSize.getHeight();

  pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
  }

  const blob = pdf.output("blob");

  // 3. Save PDF locally using fileStorageService
  const savedInfo = await fileStorageService.saveFile({
    filename,
    blob,
    mimeType: "application/pdf",
  });

  // 4. Save record to local history
  const record = {
    materialId: `pdf_${Date.now()}`,
    fileId: filename,
    title: title || filename,
    filename: savedInfo.filename,
    localPath: savedInfo.localPath,
    fileSize: blob.size,
    mimeType: "application/pdf",
  };

  await historyService.addRecord(record);

  // 5. Trigger Pop-up notification banner
  if (triggerNotification) {
    triggerNotification({
      filename: savedInfo.filename,
      localPath: savedInfo.localPath,
      mimeType: "application/pdf",
      title: title || filename,
    });
  }

  return { savedInfo, record, blob };
};

export const pdfGeneratorService = {
  generateAndSavePdf,
};
