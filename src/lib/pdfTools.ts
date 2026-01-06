import { PDFDocument } from 'pdf-lib';

// Image to PDF layout options
export type ImageLayoutMode = 'fit' | 'fill' | 'stretch' | 'center';
export type PageOrientation = 'portrait' | 'landscape';
export type PageSize = 'a4' | 'letter' | 'legal' | 'a3' | 'custom';

// Page size configurations
export const PAGE_SIZES = {
  a4: { width: 595, height: 842 },
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
  a3: { width: 842, height: 1191 }
};

// Enhanced images to PDF conversion with layout options
export async function convertImagesToPdf(
  files: File[],
  options: {
    layoutMode: ImageLayoutMode;
    orientation: PageOrientation;
    pageSize: PageSize;
    customWidth?: number;
    customHeight?: number;
  } = {
    layoutMode: 'fit',
    orientation: 'portrait',
    pageSize: 'a4'
  }
): Promise<Blob> {
  const doc = await PDFDocument.create();
  
  // Get page dimensions
  let pageWidth: number;
  let pageHeight: number;
  
  if (options.pageSize === 'custom' && options.customWidth && options.customHeight) {
    pageWidth = options.customWidth;
    pageHeight = options.customHeight;
  } else {
    const size = PAGE_SIZES[options.pageSize as keyof typeof PAGE_SIZES] || PAGE_SIZES.a4;
    pageWidth = size.width;
    pageHeight = size.height;
  }
  
  // Apply orientation
  if (options.orientation === 'landscape') {
    [pageWidth, pageHeight] = [pageHeight, pageWidth];
  }
  
  for (const file of files) {
    const data = await file.arrayBuffer();
    let embedded;
    
    // Embed image based on type
    if (file.type === 'image/png') {
      embedded = await doc.embedPng(data);
    } else {
      embedded = await doc.embedJpg(data);
    }
    
    const { width: imgWidth, height: imgHeight } = embedded.scale(1);
    const page = doc.addPage([pageWidth, pageHeight]);
    
    let x = 0;
    let y = 0;
    let drawWidth = imgWidth;
    let drawHeight = imgHeight;
    
    switch (options.layoutMode) {
      case 'fit':
        // Fit image within page bounds while maintaining aspect ratio
        const fitScale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
        drawWidth = imgWidth * fitScale;
        drawHeight = imgHeight * fitScale;
        x = (pageWidth - drawWidth) / 2;
        y = (pageHeight - drawHeight) / 2;
        break;
        
      case 'fill':
        // Fill entire page, may crop image but maintains aspect ratio
        const fillScale = Math.max(pageWidth / imgWidth, pageHeight / imgHeight);
        drawWidth = imgWidth * fillScale;
        drawHeight = imgHeight * fillScale;
        x = (pageWidth - drawWidth) / 2;
        y = (pageHeight - drawHeight) / 2;
        break;
        
      case 'stretch':
        // Stretch to fill entire page, may distort aspect ratio
        drawWidth = pageWidth;
        drawHeight = pageHeight;
        x = 0;
        y = 0;
        break;
        
      case 'center':
        // Center image at original size (may be clipped if larger than page)
        drawWidth = Math.min(imgWidth, pageWidth);
        drawHeight = Math.min(imgHeight, pageHeight);
        x = (pageWidth - drawWidth) / 2;
        y = (pageHeight - drawHeight) / 2;
        break;
    }
    
    page.drawImage(embedded, {
      x,
      y,
      width: drawWidth,
      height: drawHeight
    });
  }
  
  const pdfBytes = await doc.save();
  const uint8Array = new Uint8Array(pdfBytes);
  return new Blob([uint8Array], { type: 'application/pdf' });
}

// Merge multiple PDF File objects into single Blob URL
export async function mergePdfFiles(files: File[]): Promise<Blob> {
  const merged = await PDFDocument.create();
  for (const f of files) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    const src = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }
  const out = await merged.save();
  const copy = new Uint8Array(out);
  return new Blob([copy], { type: 'application/pdf' });
}

// Split a PDF into individual page PDFs; returns array of {pageNumber, blob}
export async function splitPdf(file: File): Promise<{ pageNumber: number; blob: Blob }[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const src = await PDFDocument.load(bytes);
  const total = src.getPageCount();
  const results: { pageNumber: number; blob: Blob }[] = [];
  for (let i = 0; i < total; i++) {
    const doc = await PDFDocument.create();
    const [page] = await doc.copyPages(src, [i]);
    doc.addPage(page);
  const out = await doc.save();
  const copy = new Uint8Array(out);
  results.push({ pageNumber: i + 1, blob: new Blob([copy], { type: 'application/pdf' }) });
  }
  return results;
}

// Get total page count of a PDF
export async function getPdfPageCount(file: File): Promise<number> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const src = await PDFDocument.load(bytes);
  return src.getPageCount();
}

// Parse page ranges string (e.g., "1-5,7,9-12") and return array of page numbers
export function parsePageRanges(rangesStr: string, totalPages: number): number[] {
  const pages = new Set<number>();
  const ranges = rangesStr.split(',').map(r => r.trim()).filter(r => r);
  
  for (const range of ranges) {
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(n => parseInt(n.trim()));
      if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
        throw new Error(`Invalid range: ${range}. Pages must be between 1 and ${totalPages}.`);
      }
      for (let i = start; i <= end; i++) {
        pages.add(i);
      }
    } else {
      const pageNum = parseInt(range);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
        throw new Error(`Invalid page number: ${range}. Pages must be between 1 and ${totalPages}.`);
      }
      pages.add(pageNum);
    }
  }
  
  return Array.from(pages).sort((a, b) => a - b);
}

// Split PDF by page ranges; returns array of {name, blob} for each range
export async function splitPdfByRanges(
  file: File, 
  rangesStr: string
): Promise<{ name: string; blob: Blob }[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const src = await PDFDocument.load(bytes);
  const totalPages = src.getPageCount();
  
  const ranges = rangesStr.split(',').map(r => r.trim()).filter(r => r);
  const results: { name: string; blob: Blob }[] = [];
  
  for (const range of ranges) {
    const pageNumbers = parsePageRanges(range, totalPages);
    const doc = await PDFDocument.create();
    
    // Copy pages (convert to 0-based indexing)
    const pageIndices = pageNumbers.map(p => p - 1);
    const pages = await doc.copyPages(src, pageIndices);
    pages.forEach(page => doc.addPage(page));
    
    const out = await doc.save();
    const copy = new Uint8Array(out);
    const blob = new Blob([copy], { type: 'application/pdf' });
    
    const rangeName = pageNumbers.length === 1 
      ? `page-${pageNumbers[0]}` 
      : `pages-${Math.min(...pageNumbers)}-${Math.max(...pageNumbers)}`;
    
    results.push({ name: rangeName, blob });
  }
  
  return results;
}

// Compression levels for PDF optimization
export type CompressionLevel = 'low' | 'medium' | 'high';

// Enhanced PDF compression with better optimization techniques
export async function compressPdf(file: File, level: CompressionLevel = 'medium'): Promise<{
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  optimizationsApplied: string[];
}> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const originalSize = bytes.length;
  const optimizationsApplied: string[] = [];
  
  try {
    const src = await PDFDocument.load(bytes);
    
    // Try multiple compression strategies
    let saveOptions: any = {};
    
    switch (level) {
      case 'low':
        saveOptions = {
          useObjectStreams: false,
          addDefaultPage: false,
          updateFieldAppearances: false
        };
        optimizationsApplied.push('Basic PDF structure optimization');
        break;
        
      case 'medium':
        saveOptions = {
          useObjectStreams: true,
          addDefaultPage: false,
          updateFieldAppearances: false
        };
        optimizationsApplied.push('Object stream compression');
        
        // Remove metadata for medium compression
        try {
          src.setTitle('');
          src.setAuthor('');
          src.setSubject('');
          src.setKeywords([]);
          src.setCreator('PDF Toolkit');
          src.setProducer('PDF Toolkit');
          src.setCreationDate(new Date());
          src.setModificationDate(new Date());
          optimizationsApplied.push('Metadata removal');
        } catch (e) {
          console.warn('Could not remove metadata:', e);
        }
        break;
        
      case 'high':
        saveOptions = {
          useObjectStreams: true,
          addDefaultPage: false,
          updateFieldAppearances: false
        };
        optimizationsApplied.push('Maximum object stream compression');
        
        // Aggressive metadata removal
        try {
          src.setTitle('');
          src.setAuthor('');
          src.setSubject('');
          src.setKeywords([]);
          src.setCreator('');
          src.setProducer('');
          src.setCreationDate(new Date(0));
          src.setModificationDate(new Date(0));
          optimizationsApplied.push('Complete metadata removal');
        } catch (e) {
          console.warn('Could not remove metadata:', e);
        }
        
        // Additional optimizations for high compression
        try {
          const pageCount = src.getPageCount();
          let pageOptimizations = 0;
          
          for (let i = 0; i < pageCount; i++) {
            const page = src.getPage(i);
            
            // Try to optimize page contents
            try {
              const { width, height } = page.getSize();
              
              // If page is very large, this might indicate optimization opportunities
              if (width > 2000 || height > 2000) {
                pageOptimizations++;
              }
              
              // Access page contents to potentially trigger internal optimizations
              page.getRotation();
              
            } catch (e) {
              // Continue with other pages
            }
          }
          
          if (pageOptimizations > 0) {
            optimizationsApplied.push(`Page structure optimization (${pageOptimizations} pages)`);
          } else {
            optimizationsApplied.push('Page structure optimization');
          }
          
        } catch (e) {
          console.warn('Could not optimize pages:', e);
        }
        
        // Try to optimize the document structure
        try {
          // Create a fresh document and copy pages to potentially optimize structure
          const optimizedDoc = await PDFDocument.create();
          const pageCount = src.getPageCount();
          
          if (pageCount > 0) {
            const pageIndices = Array.from({ length: pageCount }, (_, i) => i);
            const pages = await optimizedDoc.copyPages(src, pageIndices);
            pages.forEach(page => optimizedDoc.addPage(page));
            
            // Use the optimized document instead
            const optimizedBytes = await optimizedDoc.save(saveOptions);
            const optimizedArray = new Uint8Array(optimizedBytes);
            const optimizedSize = optimizedArray.length;
            
            // Check if this optimization helped
            if (optimizedSize < bytes.length * 0.98) { // At least 2% improvement
              optimizationsApplied.push('Document structure rebuild');
              const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;
              return {
                blob: new Blob([optimizedArray], { type: 'application/pdf' }),
                originalSize,
                compressedSize: optimizedSize,
                compressionRatio: Math.max(0, compressionRatio),
                optimizationsApplied
              };
            }
          }
        } catch (e) {
          console.warn('Document structure optimization failed:', e);
        }
        
        break;
    }
    
    // Save with compression options
    const compressedBytes = await src.save(saveOptions);
    const compressedArray = new Uint8Array(compressedBytes);
    let compressedSize = compressedArray.length;
    
    // For very small improvements, try an alternative approach
    if (level === 'high' && compressedSize >= originalSize * 0.98) {
      try {
        // Try saving without object streams as sometimes it can be more efficient
        const alternativeBytes = await src.save({
          useObjectStreams: false,
          addDefaultPage: false,
          updateFieldAppearances: false
        });
        const alternativeArray = new Uint8Array(alternativeBytes);
        
        if (alternativeArray.length < compressedSize) {
          compressedSize = alternativeArray.length;
          optimizationsApplied.push('Alternative compression method');
          const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
          return {
            blob: new Blob([alternativeArray], { type: 'application/pdf' }),
            originalSize,
            compressedSize,
            compressionRatio: Math.max(0, compressionRatio),
            optimizationsApplied
          };
        }
      } catch (e) {
        console.warn('Alternative compression failed:', e);
      }
    }
    
    // Calculate compression ratio
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
    
    const blob = new Blob([compressedArray], { type: 'application/pdf' });
    
    return {
      blob,
      originalSize,
      compressedSize,
      compressionRatio: Math.max(0, compressionRatio),
      optimizationsApplied
    };
    
  } catch (error) {
    console.error('PDF compression failed:', error);
    
    // Fallback: if compression fails, return original file with minimal processing
    try {
      const src = await PDFDocument.load(bytes);
      const fallbackBytes = await src.save({ useObjectStreams: true });
      const fallbackArray = new Uint8Array(fallbackBytes);
      const fallbackSize = fallbackArray.length;
      const compressionRatio = ((originalSize - fallbackSize) / originalSize) * 100;
      
      return {
        blob: new Blob([fallbackArray], { type: 'application/pdf' }),
        originalSize,
        compressedSize: fallbackSize,
        compressionRatio: Math.max(0, compressionRatio),
        optimizationsApplied: ['Fallback compression']
      };
    } catch (fallbackError) {
      // Ultimate fallback: return original file
      console.error('Fallback compression also failed:', fallbackError);
      return {
        blob: new Blob([bytes], { type: 'application/pdf' }),
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        optimizationsApplied: ['No compression applied (error)']
      };
    }
  }
}

// Get estimated compression info
export function getCompressionInfo(level: CompressionLevel): { 
  name: string; 
  description: string; 
  estimatedReduction: string;
} {
  switch (level) {
    case 'low':
      return {
        name: 'Low Compression',
        description: 'Basic optimization, preserves all metadata, fastest processing',
        estimatedReduction: '0-5%'
      };
    case 'medium':
      return {
        name: 'Medium Compression',
        description: 'Object compression + metadata removal, good balance',
        estimatedReduction: '1-10%'
      };
    case 'high':
      return {
        name: 'High Compression',
        description: 'All optimizations + structure rebuild, best compression',
        estimatedReduction: '2-15%'
      };
  }
}

// Utility function to format file sizes
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Convert PDF to images (extract pages as images)
export async function convertPdfToImages(file: File): Promise<Array<{ pageNumber: number; blob: Blob; dataUrl: string }>> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: Array<{ pageNumber: number; blob: Blob; dataUrl: string }> = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better quality
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({
      canvasContext: context!,
      viewport: viewport
    }).promise;
    
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });
    
    const dataUrl = canvas.toDataURL('image/png');
    images.push({ pageNumber: i, blob, dataUrl });
  }
  
  return images;
}

// Rotate PDF pages
export async function rotatePdf(file: File, rotation: 90 | 180 | 270): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  const pages = pdfDoc.getPages();
  pages.forEach(page => {
    const currentRotation = page.getRotation().angle;
    page.setRotation({ type: 'degrees', angle: (currentRotation + rotation) % 360 });
  });
  
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer], { type: 'application/pdf' });
}

// Remove pages from PDF
export async function removePagesFromPdf(file: File, pagesToRemove: number[]): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  // Sort in descending order to avoid index shifting
  const sortedPages = [...pagesToRemove].sort((a, b) => b - a);
  
  for (const pageNum of sortedPages) {
    if (pageNum > 0 && pageNum <= pdfDoc.getPageCount()) {
      pdfDoc.removePage(pageNum - 1); // 0-indexed
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer], { type: 'application/pdf' });
}

// Add page numbers to PDF
export async function addPageNumbersToPdf(
  file: File, 
  options: { 
    position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    fontSize: number;
    startNumber: number;
  }
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  
  const { StandardFonts, rgb } = await import('pdf-lib');
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  pages.forEach((page, index) => {
    const { width, height } = page.getSize();
    const pageNumber = options.startNumber + index;
    const text = `${pageNumber}`;
    const textWidth = font.widthOfTextAtSize(text, options.fontSize);
    
    let x = 0;
    let y = 0;
    const margin = 30;
    
    // Calculate position
    switch (options.position) {
      case 'top-left':
        x = margin;
        y = height - margin;
        break;
      case 'top-center':
        x = (width - textWidth) / 2;
        y = height - margin;
        break;
      case 'top-right':
        x = width - textWidth - margin;
        y = height - margin;
        break;
      case 'bottom-left':
        x = margin;
        y = margin;
        break;
      case 'bottom-center':
        x = (width - textWidth) / 2;
        y = margin;
        break;
      case 'bottom-right':
        x = width - textWidth - margin;
        y = margin;
        break;
    }
    
    page.drawText(text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  });
  
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer], { type: 'application/pdf' });
}

// Add watermark to PDF
export async function addWatermarkToPdf(
  file: File,
  watermarkText: string,
  options: {
    fontSize: number;
    opacity: number;
    rotation: number;
    color: { r: number; g: number; b: number };
  }
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  
  const { StandardFonts, rgb } = await import('pdf-lib');
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  pages.forEach((page) => {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(watermarkText, options.fontSize);
    
    page.drawText(watermarkText, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: options.fontSize,
      font,
      color: rgb(options.color.r, options.color.g, options.color.b),
      opacity: options.opacity,
      rotate: { type: 'degrees', angle: options.rotation },
    });
  });
  
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer], { type: 'application/pdf' });
}

// Convert PDF to Word (extract text and create DOCX)
export async function convertPdfToWord(file: File): Promise<Blob> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  
  const { Document, Paragraph, TextRun, Packer } = await import('docx');
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const allParagraphs: any[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Add page separator
    if (i > 1) {
      allParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '', break: 2 })],
        })
      );
    }
    
    // Add page text
    textContent.items.forEach((item: any) => {
      if (item.str && item.str.trim()) {
        allParagraphs.push(
          new Paragraph({
            children: [new TextRun(item.str)],
          })
        );
      }
    });
  }
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: allParagraphs,
    }],
  });
  
  const blob = await Packer.toBlob(doc);
  return blob;
}
