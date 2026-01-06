import React, { useCallback, useEffect, useRef, useState } from 'react';
import styling from '../../../styling.json';
import { Upload, FileText, X, ArrowUp, ArrowDown, Wand2, FileType, Download, AlertCircle, List, FileCheck, Code, BarChart3, Scissors, Heading } from 'lucide-react';
import styles from './pdfTools.module.css';

type Operation = 'word-to-pdf' | 'word-to-txt' | 'merge-word' | 'extract-text' | 'word-to-html' | 'word-stats' | 'split-pages' | 'add-headers';

interface LocalFile {
  id: string;
  file: File;
}

const WordToolsPage: React.FC = () => {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrls, setResultUrls] = useState<Array<{ name: string; url: string; type: string }>>([]);
  const [extractedText, setExtractedText] = useState<string>('');
  const [wordStats, setWordStats] = useState<{words: number; chars: number; lines: number; pages: number} | null>(null);
  
  // Split pages options
  const [pagesPerSplit, setPagesPerSplit] = useState<number>(1);
  
  // Add headers options
  const [headerText, setHeaderText] = useState<string>('Document Header');
  
  const inputRef = useRef<HTMLInputElement | null>(null);

  const colors = styling.colors;

  const isWord = (f: File) => 
    f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
    f.name.toLowerCase().endsWith('.docx') ||
    f.type === 'application/msword' ||
    f.name.toLowerCase().endsWith('.doc');

  const validateFiles = useCallback((incoming: File[]): boolean => {
    if (!incoming.length) return false;
    return incoming.every(isWord);
  }, []);

  const onFiles = useCallback(async (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    if (!validateFiles(arr)) {
      setError('All files must be Word documents (.docx or .doc).');
      return;
    }
    setError(null);
    setResultUrls([]);
    setExtractedText('');
    
    setFiles(prev => ([...prev, ...arr.map(f => ({ id: crypto.randomUUID(), file: f }))]));
  }, [validateFiles]);

  const onDrop: React.DragEventHandler<HTMLDivElement> = e => {
    e.preventDefault();
    onFiles(e.dataTransfer.files);
  };
  
  const onDragOver: React.DragEventHandler<HTMLDivElement> = e => { 
    e.preventDefault(); 
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const moveFile = (id: string, dir: -1 | 1) => {
    setFiles(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= next.length) return prev;
      const [item] = next.splice(idx, 1);
      next.splice(newIdx, 0, item);
      return next;
    });
  };

  const clearAll = () => { 
    setFiles([]); 
    setResultUrls([]); 
    setError(null);
    setExtractedText('');
    setWordStats(null);
  };

  // Extract text from Word document
  const extractTextFromWord = async (file: File): Promise<string> => {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (err) {
      throw new Error(`Failed to extract text: ${err}`);
    }
  };

  // Convert Word to PDF (using docx library to extract and then pdf-lib)
  const convertWordToPdf = async (file: File): Promise<Blob> => {
    try {
      const mammoth = await import('mammoth');
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      
      // Extract text from Word
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      
      // Create PDF
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      
      const fontSize = 12;
      const margin = 50;
      const pageWidth = 595; // A4 width in points
      const pageHeight = 842; // A4 height in points
      const maxWidth = pageWidth - (margin * 2);
      const lineHeight = fontSize * 1.2;
      
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let yPosition = pageHeight - margin;
      
      // Split text into lines that fit the page width
      const lines: string[] = [];
      const paragraphs = text.split('\n');
      
      for (const paragraph of paragraphs) {
        if (!paragraph.trim()) {
          lines.push('');
          continue;
        }
        
        const words = paragraph.split(' ');
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const width = timesRomanFont.widthOfTextAtSize(testLine, fontSize);
          
          if (width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        
        if (currentLine) {
          lines.push(currentLine);
        }
      }
      
      // Draw lines on pages
      for (const line of lines) {
        if (yPosition < margin) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
        }
        
        page.drawText(line, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
        
        yPosition -= lineHeight;
      }
      
      const pdfBytes = await pdfDoc.save();
      const buffer = pdfBytes.buffer as ArrayBuffer;
      return new Blob([buffer], { type: 'application/pdf' });
    } catch (err: any) {
      throw new Error(`Failed to convert to PDF: ${err.message}`);
    }
  };

  // Convert Word to plain text
  const convertWordToTxt = async (file: File): Promise<Blob> => {
    try {
      const text = await extractTextFromWord(file);
      return new Blob([text], { type: 'text/plain' });
    } catch (err: any) {
      throw new Error(`Failed to convert to TXT: ${err.message}`);
    }
  };

  // Merge Word documents
  const mergeWordDocuments = async (fileList: File[]): Promise<Blob> => {
    try {
      const mammoth = await import('mammoth');
      const { Document, Paragraph, TextRun, Packer } = await import('docx');
      
      const allParagraphs: any[] = [];
      
      for (const file of fileList) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;
        
        // Add document separator
        if (allParagraphs.length > 0) {
          allParagraphs.push(
            new Paragraph({
              children: [new TextRun({ text: '', break: 2 })],
            })
          );
          allParagraphs.push(
            new Paragraph({
              children: [new TextRun({ text: `--- ${file.name} ---`, bold: true })],
            })
          );
          allParagraphs.push(
            new Paragraph({
              children: [new TextRun({ text: '', break: 1 })],
            })
          );
        }
        
        // Add content
        const paragraphs = text.split('\n');
        for (const para of paragraphs) {
          allParagraphs.push(
            new Paragraph({
              children: [new TextRun(para || ' ')],
            })
          );
        }
      }
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: allParagraphs,
        }],
      });
      
      const blob = await Packer.toBlob(doc);
      return blob;
    } catch (err: any) {
      throw new Error(`Failed to merge documents: ${err.message}`);
    }
  };

  // Convert Word to HTML
  const convertWordToHtml = async (file: File): Promise<string> => {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      return result.value;
    } catch (err: any) {
      throw new Error(`Failed to convert to HTML: ${err.message}`);
    }
  };

  // Get Word document statistics
  const getWordStats = async (file: File): Promise<{words: number; chars: number; lines: number; pages: number}> => {
    try {
      const text = await extractTextFromWord(file);
      const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
      const chars = text.length;
      const lines = text.split('\n').length;
      const pages = Math.ceil(words / 250); // Approximate pages (250 words per page)
      
      return { words, chars, lines, pages };
    } catch (err: any) {
      throw new Error(`Failed to get statistics: ${err.message}`);
    }
  };

  // Split Word document by pages (approximate based on word count)
  const splitWordByPages = async (file: File, pagesPerSplit: number = 1): Promise<Blob[]> => {
    try {
      const mammoth = await import('mammoth');
      const { Document, Paragraph, TextRun, Packer } = await import('docx');
      
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      
      const paragraphs = text.split('\n');
      const wordsPerPage = 250;
      const wordsPerSplit = wordsPerPage * pagesPerSplit;
      
      const blobs: Blob[] = [];
      let currentWords = 0;
      let currentParagraphs: any[] = [];
      
      for (const para of paragraphs) {
        const paraWords = para.trim().split(/\s+/).filter(w => w.length > 0).length;
        
        if (currentWords + paraWords > wordsPerSplit && currentParagraphs.length > 0) {
          // Create document from current paragraphs
          const doc = new Document({
            sections: [{ properties: {}, children: currentParagraphs }],
          });
          const blob = await Packer.toBlob(doc);
          blobs.push(blob);
          
          // Reset for next split
          currentWords = 0;
          currentParagraphs = [];
        }
        
        currentParagraphs.push(
          new Paragraph({
            children: [new TextRun(para || ' ')],
          })
        );
        currentWords += paraWords;
      }
      
      // Add remaining paragraphs
      if (currentParagraphs.length > 0) {
        const doc = new Document({
          sections: [{ properties: {}, children: currentParagraphs }],
        });
        const blob = await Packer.toBlob(doc);
        blobs.push(blob);
      }
      
      return blobs;
    } catch (err: any) {
      throw new Error(`Failed to split document: ${err.message}`);
    }
  };

  // Add headers/footers to Word document
  const addHeadersToWord = async (file: File, headerText: string): Promise<Blob> => {
    try {
      const mammoth = await import('mammoth');
      const { Document, Paragraph, TextRun, Packer, Header, AlignmentType } = await import('docx');
      
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      
      const paragraphs = text.split('\n').map(para =>
        new Paragraph({
          children: [new TextRun(para || ' ')],
        })
      );
      
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: headerText,
                      bold: true,
                      size: 24,
                    }),
                  ],
                }),
              ],
            }),
          },
          children: paragraphs,
        }],
      });
      
      const blob = await Packer.toBlob(doc);
      return blob;
    } catch (err: any) {
      throw new Error(`Failed to add headers: ${err.message}`);
    }
  };

  const process = async () => {
    if (!files.length) { 
      setError('Add at least one Word document.'); 
      return; 
    }
    
    if (operation === 'merge-word' && files.length < 2) {
      setError('Please add at least two Word documents to merge.');
      return;
    }
    
    setProcessing(true); 
    setError(null); 
    setResultUrls([]);
    setExtractedText('');
    
    try {
      const results: Array<{ name: string; url: string; type: string }> = [];
      
      switch (operation) {
        case 'word-to-pdf':
          for (const localFile of files) {
            const blob = await convertWordToPdf(localFile.file);
            const originalName = localFile.file.name;
            const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
            results.push({
              name: `${nameWithoutExt}.pdf`,
              url: URL.createObjectURL(blob),
              type: 'pdf'
            });
          }
          break;
          
        case 'word-to-txt':
          for (const localFile of files) {
            const blob = await convertWordToTxt(localFile.file);
            const originalName = localFile.file.name;
            const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
            results.push({
              name: `${nameWithoutExt}.txt`,
              url: URL.createObjectURL(blob),
              type: 'txt'
            });
          }
          break;
          
        case 'merge-word':
          const blob = await mergeWordDocuments(files.map(f => f.file));
          results.push({
            name: 'merged-document.docx',
            url: URL.createObjectURL(blob),
            type: 'docx'
          });
          break;
          
        case 'extract-text':
          const textParts: string[] = [];
          for (const localFile of files) {
            const text = await extractTextFromWord(localFile.file);
            textParts.push(`=== ${localFile.file.name} ===\n\n${text}\n\n`);
          }
          setExtractedText(textParts.join('\n'));
          break;
        
        case 'word-to-html':
          for (const localFile of files) {
            const html = await convertWordToHtml(localFile.file);
            const htmlBlob = new Blob([html], { type: 'text/html' });
            const originalName = localFile.file.name;
            const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
            results.push({
              name: `${nameWithoutExt}.html`,
              url: URL.createObjectURL(htmlBlob),
              type: 'html'
            });
          }
          break;
        
        case 'word-stats':
          const stats = await getWordStats(files[0].file);
          setWordStats(stats);
          break;
        
        case 'split-pages':
          for (const localFile of files) {
            const blobs = await splitWordByPages(localFile.file, pagesPerSplit);
            const originalName = localFile.file.name;
            const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
            
            blobs.forEach((blob, idx) => {
              results.push({
                name: `${nameWithoutExt}_part${idx + 1}.docx`,
                url: URL.createObjectURL(blob),
                type: 'docx'
              });
            });
          }
          break;
        
        case 'add-headers':
          for (const localFile of files) {
            const blob = await addHeadersToWord(localFile.file, headerText);
            const originalName = localFile.file.name;
            const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
            results.push({
              name: `${nameWithoutExt}_with_header.docx`,
              url: URL.createObjectURL(blob),
              type: 'docx'
            });
          }
          break;
          
        default:
          break;
      }
      
      setResultUrls(results);
    } catch (e: any) {
      setError(e.message || 'Processing failed.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadAll = async () => {
    if (resultUrls.length === 1) {
      // Single file - direct download
      const link = document.createElement('a');
      link.href = resultUrls[0].url;
      link.download = resultUrls[0].name;
      link.click();
    } else {
      // Multiple files - create ZIP
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      for (const result of resultUrls) {
        const response = await fetch(result.url);
        const blob = await response.blob();
        zip.file(result.name, blob);
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'processed-documents.zip';
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const copyTextToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    setError(null);
    // Show success message briefly
    const originalError = error;
    setError('Text copied to clipboard!');
    setTimeout(() => setError(originalError), 2000);
  };

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    if (wrapperRef.current) {
      const el = wrapperRef.current;
      
      // Background colors
      el.style.setProperty('--pdf-bg-item', colors.background.itemBackground);
      el.style.setProperty('--pdf-bg-hover', colors.background.hover);
      el.style.setProperty('--pdf-bg-item-hover', colors.background.itemHover);
      el.style.setProperty('--pdf-bg-button', colors.background.buttonBackground);
      el.style.setProperty('--pdf-bg-button-hover', colors.background.buttonHover);
      el.style.setProperty('--pdf-bg-transparent', colors.background.transparent);
      
      // Border colors
      el.style.setProperty('--pdf-border-primary', colors.border.primary);
      
      // Text colors
      el.style.setProperty('--pdf-text-primary', colors.text.primary);
      el.style.setProperty('--pdf-text-opacity', '0.75');
      
      // Typography
      el.style.setProperty('--pdf-font', styling.fonts.primary);
      el.style.setProperty('--pdf-heading-size', styling.typography.heading.fontSize);
      el.style.setProperty('--pdf-heading-weight', styling.typography.heading.fontWeight);
      el.style.setProperty('--pdf-heading-margin', styling.typography.heading.marginBottom);
      el.style.setProperty('--pdf-description-size', styling.typography.description.fontSize);
      el.style.setProperty('--pdf-description-weight', styling.typography.description.fontWeight);
      el.style.setProperty('--pdf-description-margin', styling.typography.description.marginBottom);
      el.style.setProperty('--pdf-button-font-size', styling.typography.button.fontSize);
      el.style.setProperty('--pdf-button-font-weight', styling.typography.button.fontWeight);
      el.style.setProperty('--pdf-item-title-size', styling.typography.itemTitle.fontSize);
      el.style.setProperty('--pdf-item-title-weight', styling.typography.itemTitle.fontWeight);
      el.style.setProperty('--pdf-item-title-margin', styling.typography.itemTitle.marginBottom);
      el.style.setProperty('--pdf-item-desc-size', styling.typography.itemDescription.fontSize);
      el.style.setProperty('--pdf-item-desc-weight', styling.typography.itemDescription.fontWeight);
      
      // Dimensions
      el.style.setProperty('--pdf-button-height', styling.dimensions.button.height);
      el.style.setProperty('--pdf-button-width', styling.dimensions.button.width);
      el.style.setProperty('--pdf-item-height', styling.dimensions.item.height);
      
      // Spacing
      el.style.setProperty('--pdf-container-padding', styling.spacing.container.padding);
      el.style.setProperty('--pdf-item-padding-left', styling.spacing.item.paddingLeft);
      el.style.setProperty('--pdf-item-padding-right', styling.spacing.item.paddingRight);
      el.style.setProperty('--pdf-item-gap', styling.spacing.item.gap);
      
      // Borders
      el.style.setProperty('--pdf-button-border-width', styling.borders.button.borderWidth);
      el.style.setProperty('--pdf-button-border-radius', styling.borders.button.borderRadius);
      el.style.setProperty('--pdf-item-border-radius', styling.borders.item.borderRadius);
      
      // Transitions
      el.style.setProperty('--pdf-transition-all', styling.transitions.all);
      el.style.setProperty('--pdf-transition-colors', styling.transitions.colors);
      el.style.setProperty('--pdf-transition-transform', styling.transitions.transform);
    }
  }, [colors, styling]);

  return (
    <div ref={wrapperRef} className={`space-y-8 ${styles.wrapper} ${styles.theme}`}> 
      <header className="space-y-2">
        <h1 className={styles.heading}>Word Toolkit</h1>
        <p className={styles.sub}>Fast local Word document operations. Files never leave your device.</p>
      </header>

      {!operation && (
        <section className="grid md:grid-cols-3 gap-6">
          {[
            { key: 'word-to-pdf', title: 'Word to PDF', desc: 'Convert Word documents to PDF format.', icon: <FileType size={20}/> },
            { key: 'word-to-txt', title: 'Word to Text', desc: 'Extract plain text from Word documents.', icon: <List size={20}/> },
            { key: 'merge-word', title: 'Merge Documents', desc: 'Combine multiple Word files into one.', icon: <Wand2 size={20}/> },
            { key: 'extract-text', title: 'Extract Text', desc: 'View and copy text from Word documents.', icon: <FileCheck size={20}/> },
            { key: 'word-to-html', title: 'Word to HTML', desc: 'Convert Word documents to HTML format.', icon: <Code size={20}/> },
            { key: 'word-stats', title: 'Document Stats', desc: 'Get word count, character count, and page count.', icon: <BarChart3 size={20}/> },
            { key: 'split-pages', title: 'Split Pages', desc: 'Split document into multiple files by pages.', icon: <Scissors size={20}/> },
            { key: 'add-headers', title: 'Add Headers', desc: 'Add custom headers to Word documents.', icon: <Heading size={20}/> }
          ].map(card => (
            <button key={card.key}
              onClick={() => { setOperation(card.key as Operation); clearAll(); }}
              className={`text-left p-5 flex flex-col gap-3 ${styles.operationCard}`}
            >
              <div className={`w-10 h-10 flex items-center justify-center ${styles.operationCardIcon}`}>
                {card.icon}
              </div>
              <div>
                <h3 className={`mb-1 ${styles.operationCardTitle}`}>{card.title}</h3>
                <p className={`leading-snug ${styles.operationCardDesc}`}>{card.desc}</p>
              </div>
            </button>
          ))}
        </section>
      )}

      {operation && (
        <section className="flex flex-wrap gap-4">
          <button onClick={() => { setOperation(null); clearAll(); }} className={styles.modeBtn}>Back</button>
          <span className="text-sm font-medium">Current: {operation}</span>
        </section>
      )}

      {operation && <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => inputRef.current?.click()}
        className={`group relative text-center hover:shadow-md ${styles.dropZone}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          <div className={styles.dropIconWrap}>
            <Upload size={28} />
          </div>
          <p className="text-sm">
            <strong>Click to choose</strong> or drag & drop Word documents here
          </p>
          <span className={styles.smallNote}>Supports .doc and .docx files</span>
        </div>
      </div>}

      {error && !error.includes('copied') && (
        <div className={`p-3 rounded-md flex items-start gap-2 text-sm ${styles.errorBox}`}>
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {error && error.includes('copied') && (
        <div className="p-3 rounded-md flex items-start gap-2 text-sm bg-green-100 text-green-800 border border-green-300">
          <FileCheck size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {operation && !!files.length && (
        <div className="space-y-4">
          {/* Split pages options */}
          {operation === 'split-pages' && (
            <div className="space-y-3 p-4 border rounded-md">
              <h3 className="text-sm font-medium">Split Options</h3>
              <div>
                <label htmlFor="pagesPerSplit" className="block text-sm font-medium mb-1">
                  Pages per split:
                </label>
                <input
                  id="pagesPerSplit"
                  type="number"
                  value={pagesPerSplit}
                  onChange={(e) => setPagesPerSplit(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Approximate split based on ~250 words per page
                </p>
              </div>
            </div>
          )}
          
          {/* Add headers options */}
          {operation === 'add-headers' && (
            <div className="space-y-3 p-4 border rounded-md">
              <h3 className="text-sm font-medium">Header Options</h3>
              <div>
                <label htmlFor="headerText" className="block text-sm font-medium mb-1">
                  Header Text:
                </label>
                <input
                  id="headerText"
                  type="text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="Enter header text"
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
          
          <ul className="space-y-2">
            {files.map((lf, idx) => (
              <li key={lf.id}
                  className={`flex items-center group ${styles.fileItem}`}>
                <div className={styles.fileIconBox}>
                  <FileText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`truncate ${styles.operationCardTitle}`} title={lf.file.name}>{lf.file.name}</p>
                  <p className={styles.operationCardDesc}>{(lf.file.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => moveFile(lf.id, -1)}
                    className={`p-1 disabled:opacity-30 ${styles.iconBtn}`}
                    title="Move up"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    disabled={idx === files.length - 1}
                    onClick={() => moveFile(lf.id, 1)}
                    className={`p-1 disabled:opacity-30 ${styles.iconBtn}`}
                    title="Move down"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    onClick={() => removeFile(lf.id)}
                    className={`p-1 ${styles.iconBtn}`}
                    title="Remove"
                  >
                    <X size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={process}
              disabled={processing}
              className={`px-4 py-2 disabled:opacity-50 flex items-center gap-2 ${styles.primaryBtn}`}
            >
              <Wand2 size={16} className={processing ? 'animate-pulse' : ''} />
              {processing ? 'Processing...' : 
                operation === 'word-to-pdf' ? 'Convert to PDF' :
                operation === 'word-to-txt' ? 'Convert to Text' :
                operation === 'merge-word' ? 'Merge Documents' :
                operation === 'extract-text' ? 'Extract Text' :
                operation === 'word-to-html' ? 'Convert to HTML' :
                operation === 'word-stats' ? 'Analyze Document' :
                operation === 'split-pages' ? 'Split Document' :
                operation === 'add-headers' ? 'Add Headers' :
                'Process'}
            </button>
            <button
              onClick={clearAll}
              disabled={processing}
              className={`px-4 py-2 disabled:opacity-50 ${styles.outlineBtn}`}
            >
              Clear
            </button>
            {resultUrls.length > 0 && (
              <button
                onClick={downloadAll}
                className={`px-4 py-2 flex items-center gap-2 ${styles.primaryBtn}`}
              >
                <Download size={16} /> Download {resultUrls.length > 1 ? 'All (ZIP)' : ''}
              </button>
            )}
          </div>
          
          {resultUrls.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Processed Documents:</h3>
              <ul className="space-y-1">
                {resultUrls.map((result, idx) => (
                  <li key={idx} className="text-sm text-gray-600">
                    ✓ {result.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {extractedText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Extracted Text:</h3>
                <button
                  onClick={copyTextToClipboard}
                  className={`px-3 py-1 text-xs ${styles.outlineBtn}`}
                >
                  Copy to Clipboard
                </button>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md max-h-96 overflow-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">{extractedText}</pre>
              </div>
            </div>
          )}

          {wordStats && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Document Statistics:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{wordStats.words}</div>
                  <div className="text-xs text-gray-600">Words</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{wordStats.chars}</div>
                  <div className="text-xs text-gray-600">Characters</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{wordStats.lines}</div>
                  <div className="text-xs text-gray-600">Lines</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{wordStats.pages}</div>
                  <div className="text-xs text-gray-600">Pages (est.)</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {operation && !files.length && (
        <p className={styles.formText}>No Word documents added yet.</p>
      )}
      
      {operation === 'merge-word' && files.length === 1 && (
        <p className={styles.formText}>Add at least one more Word document to merge.</p>
      )}
    </div>
  );
};

export default WordToolsPage;
