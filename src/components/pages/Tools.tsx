import React, { useCallback, useEffect, useRef, useState } from 'react';
import styling from '../../../styling.json';
import { Upload, File as FileIcon, X, ArrowUp, ArrowDown, Wand2, Images, FileSymlink, Download, AlertCircle, Scissors, RotateCw, Trash2, Hash, Droplet, FileType2 } from 'lucide-react';
import styles from './pdfTools.module.css';
import { 
  mergePdfFiles, 
  splitPdf, 
  splitPdfByRanges, 
  getPdfPageCount, 
  compressPdf, 
  getCompressionInfo, 
  formatFileSize, 
  convertImagesToPdf, 
  convertPdfToImages,
  rotatePdf,
  removePagesFromPdf,
  addPageNumbersToPdf,
  addWatermarkToPdf,
  convertPdfToWord,
  CompressionLevel, 
  ImageLayoutMode, 
  PageOrientation, 
  PageSize 
} from '../../lib/pdfTools';

type Operation = 'merge' | 'images-to-pdf' | 'split' | 'compress' | 'pdf-to-images' | 'rotate' | 'remove-pages' | 'page-numbers' | 'watermark' | 'pdf-to-word';

interface LocalFile {
  id: string;
  file: File;
}

const ToolsPage: React.FC = () => {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [pageRanges, setPageRanges] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(0);
  const [splitMode, setSplitMode] = useState<'all' | 'ranges'>('all');
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium');
  const [compressionResults, setCompressionResults] = useState<{
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    optimizationsApplied: string[];
  } | null>(null);
  const [imageLayoutMode, setImageLayoutMode] = useState<ImageLayoutMode>('fit');
  const [pageOrientation, setPageOrientation] = useState<PageOrientation>('portrait');
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  
  // Rotate options
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);
  
  // Remove pages options
  const [pagesToRemove, setPagesToRemove] = useState<string>('');
  
  // Page numbers options
  const [pageNumberPosition, setPageNumberPosition] = useState<'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'>('bottom-center');
  const [pageNumberSize, setPageNumberSize] = useState<number>(12);
  const [pageNumberStart, setPageNumberStart] = useState<number>(1);
  
  // Watermark options
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [watermarkSize, setWatermarkSize] = useState<number>(60);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.3);
  const [watermarkRotation, setWatermarkRotation] = useState<number>(45);
  
  // PDF to images result
  const [extractedImages, setExtractedImages] = useState<Array<{ pageNumber: number; dataUrl: string }>>([]);
  
  const inputRef = useRef<HTMLInputElement | null>(null);

  const colors = styling.colors;
  // font handled via CSS variable

  const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
  const isImage = (f: File) => f.type.startsWith('image/');

  const validateFiles = useCallback((incoming: File[]): boolean => {
    if (!incoming.length) return false;
    if (operation === 'merge' || operation === 'split' || operation === 'compress' || 
        operation === 'pdf-to-images' || operation === 'rotate' || operation === 'remove-pages' || 
        operation === 'page-numbers' || operation === 'watermark' || operation === 'pdf-to-word') {
      return incoming.every(isPdf);
    }
    if (operation === 'images-to-pdf') {
      return incoming.every(isImage);
    }
    return false;
  }, [operation]);

  const onFiles = useCallback(async (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    if (!validateFiles(arr)) {
  setError(operation === 'images-to-pdf' ? 'All files must be images (png/jpg).' : 'All files must be PDFs.');
      return;
    }
    setError(null);
    setResultUrl(null);
    setFiles(prev => ([...prev, ...arr.map(f => ({ id: crypto.randomUUID(), file: f }))]));
    
    // Get page count for split operation
    if (operation === 'split' && arr.length === 1 && isPdf(arr[0])) {
      try {
        const count = await getPdfPageCount(arr[0]);
        setTotalPages(count);
      } catch (err) {
        console.error('Failed to get page count:', err);
        setTotalPages(0);
      }
    }
  }, [validateFiles, operation]);

  const onDrop: React.DragEventHandler<HTMLDivElement> = e => {
    e.preventDefault();
    onFiles(e.dataTransfer.files);
  };
  const onDragOver: React.DragEventHandler<HTMLDivElement> = e => { e.preventDefault(); };

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));
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
    setResultUrl(null); 
    setError(null); 
    setPageRanges(''); 
    setTotalPages(0); 
    setSplitMode('all'); 
    setCompressionLevel('medium');
    setCompressionResults(null);
    setImageLayoutMode('fit');
    setPageOrientation('portrait');
    setPageSize('a4');
    setRotationAngle(90);
    setPagesToRemove('');
    setPageNumberPosition('bottom-center');
    setPageNumberSize(12);
    setPageNumberStart(1);
    setWatermarkText('CONFIDENTIAL');
    setWatermarkSize(60);
    setWatermarkOpacity(0.3);
    setWatermarkRotation(45);
    setExtractedImages([]);
  };



  const process = async () => {
    if (!files.length) { setError('Add at least one file.'); return; }
    if (!validateFiles(files.map(f => f.file) as File[])) return;
    setProcessing(true); setError(null); setResultUrl(null);
    try {
      let url: string | null = null;
      const fileList = files.map(f => f.file);
      
      switch (operation) {
        case 'merge': {
          if (fileList.length < 2) {
            setError('Please select at least two PDF files to merge.');
            return;
          }
          const blob = await mergePdfFiles(fileList);
          url = URL.createObjectURL(blob);
          break;
        }
        case 'images-to-pdf': {
          const blob = await convertImagesToPdf(fileList, {
            layoutMode: imageLayoutMode,
            orientation: pageOrientation,
            pageSize: pageSize
          });
          url = URL.createObjectURL(blob);
          break;
        }
        case 'split': {
          if (fileList.length !== 1) {
            setError('Please select exactly one PDF file to split.');
            return;
          }
          
          if (splitMode === 'all') {
            // Original split functionality - split into individual pages
            const pages = await splitPdf(fileList[0]);
            // Create ZIP of all pages
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            
            for (const page of pages) {
              zip.file(`page-${page.pageNumber}.pdf`, page.blob);
            }
            
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            url = URL.createObjectURL(zipBlob);
          } else {
            // New range-based split functionality
            if (!pageRanges.trim()) {
              setError('Please enter page ranges (e.g., 1-5,7,9-12).');
              return;
            }
            
            try {
              const rangePdfs = await splitPdfByRanges(fileList[0], pageRanges);
              
              if (rangePdfs.length === 1) {
                // Single range, return PDF directly
                url = URL.createObjectURL(rangePdfs[0].blob);
              } else {
                // Multiple ranges, create ZIP
                const JSZip = (await import('jszip')).default;
                const zip = new JSZip();
                
                for (const range of rangePdfs) {
                  zip.file(`${range.name}.pdf`, range.blob);
                }
                
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                url = URL.createObjectURL(zipBlob);
              }
            } catch (err: any) {
              setError(err.message || 'Invalid page ranges.');
              return;
            }
          }
          break;
        }
        case 'compress': {
          if (fileList.length !== 1) {
            setError('Please select exactly one PDF file to compress.');
            return;
          }
          const result = await compressPdf(fileList[0], compressionLevel);
          setCompressionResults({
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            compressionRatio: result.compressionRatio,
            optimizationsApplied: result.optimizationsApplied
          });
          url = URL.createObjectURL(result.blob);
          break;
        }
        case 'pdf-to-images': {
          if (fileList.length !== 1) {
            setError('Please select exactly one PDF file to convert.');
            return;
          }
          const images = await convertPdfToImages(fileList[0]);
          setExtractedImages(images.map(img => ({ pageNumber: img.pageNumber, dataUrl: img.dataUrl })));
          
          // Create ZIP of all images
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          
          for (const img of images) {
            zip.file(`page-${img.pageNumber}.png`, img.blob);
          }
          
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          url = URL.createObjectURL(zipBlob);
          break;
        }
        case 'rotate': {
          if (fileList.length !== 1) {
            setError('Please select exactly one PDF file to rotate.');
            return;
          }
          const blob = await rotatePdf(fileList[0], rotationAngle);
          url = URL.createObjectURL(blob);
          break;
        }
        case 'remove-pages': {
          if (fileList.length !== 1) {
            setError('Please select exactly one PDF file.');
            return;
          }
          if (!pagesToRemove.trim()) {
            setError('Please enter page numbers to remove (e.g., 1,3,5 or 2-4).');
            return;
          }
          
          // Parse page numbers
          const pages: number[] = [];
          const parts = pagesToRemove.split(',');
          for (const part of parts) {
            if (part.includes('-')) {
              const [start, end] = part.split('-').map(n => parseInt(n.trim()));
              for (let i = start; i <= end; i++) {
                pages.push(i);
              }
            } else {
              pages.push(parseInt(part.trim()));
            }
          }
          
          const blob = await removePagesFromPdf(fileList[0], pages);
          url = URL.createObjectURL(blob);
          break;
        }
        case 'page-numbers': {
          if (fileList.length !== 1) {
            setError('Please select exactly one PDF file.');
            return;
          }
          const blob = await addPageNumbersToPdf(fileList[0], {
            position: pageNumberPosition,
            fontSize: pageNumberSize,
            startNumber: pageNumberStart
          });
          url = URL.createObjectURL(blob);
          break;
        }
        case 'watermark': {
          if (fileList.length !== 1) {
            setError('Please select exactly one PDF file.');
            return;
          }
          const blob = await addWatermarkToPdf(fileList[0], watermarkText, {
            fontSize: watermarkSize,
            opacity: watermarkOpacity,
            rotation: watermarkRotation,
            color: { r: 0.5, g: 0.5, b: 0.5 }
          });
          url = URL.createObjectURL(blob);
          break;
        }
        case 'pdf-to-word': {
          if (fileList.length !== 1) {
            setError('Please select exactly one PDF file to convert.');
            return;
          }
          const blob = await convertPdfToWord(fileList[0]);
          url = URL.createObjectURL(blob);
          break;
        }
        default:
          break;
      }
      if (url) setResultUrl(url);
    } catch (e: any) {
      setError(e.message || 'Processing failed.');
    } finally {
      setProcessing(false);
    }
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
        <h1 className={styles.heading}>PDF Toolkit</h1>
        <p className={styles.sub}>Fast local PDF operations. Files never leave your device.</p>
      </header>

      {!operation && (
        <section className="grid md:grid-cols-3 gap-6">
          {[
            { key: 'merge', title: 'Merge PDF', desc: 'Combine multiple PDFs in order (min 2 files).', icon: <Wand2 size={20}/> },
            { key: 'split', title: 'Split PDF', desc: 'Split a PDF into individual pages or ranges.', icon: <Scissors size={20}/> },
            { key: 'compress', title: 'Compress PDF', desc: 'Reduce file size with optimizations.', icon: <Wand2 size={20}/> },
            { key: 'images-to-pdf', title: 'Images → PDF', desc: 'Turn images into a single PDF.', icon: <Images size={20}/> },
            { key: 'pdf-to-images', title: 'PDF → Images', desc: 'Extract PDF pages as images.', icon: <Images size={20}/> },
            { key: 'rotate', title: 'Rotate PDF', desc: 'Rotate all pages by 90, 180, or 270 degrees.', icon: <RotateCw size={20}/> },
            { key: 'remove-pages', title: 'Remove Pages', desc: 'Delete specific pages from PDF.', icon: <Trash2 size={20}/> },
            { key: 'page-numbers', title: 'Page Numbers', desc: 'Add page numbers to PDF.', icon: <Hash size={20}/> },
            { key: 'watermark', title: 'Watermark', desc: 'Add watermark text to all pages.', icon: <Droplet size={20}/> },
            { key: 'pdf-to-word', title: 'PDF → Word', desc: 'Convert PDF to editable Word document.', icon: <FileType2 size={20}/> }
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
            accept={operation === 'images-to-pdf' ? 'image/*' : '.pdf,application/pdf'}
            hidden
            onChange={(e) => onFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          <div className={styles.dropIconWrap}>
            <Upload size={28} />
          </div>
          <p className="text-sm">
            <strong>Click to choose</strong> or drag & drop {operation === 'images-to-pdf' ? 'images' : 'PDF files'} here
          </p>
          <span className={styles.smallNote}>Order matters for the output</span>
        </div>
  </div>}

      {error && (
        <div className={`p-3 rounded-md flex items-start gap-2 text-sm ${styles.errorBox}`}>
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

  {operation && !!files.length && (
        <div className="space-y-4">
          {/* Split mode selection */}
          {operation === 'split' && totalPages > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Split Options</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="splitMode"
                    value="all"
                    checked={splitMode === 'all'}
                    onChange={(e) => setSplitMode(e.target.value as 'all' | 'ranges')}
                    className="text-sm"
                  />
                  <span className="text-sm">Split into individual pages ({totalPages} pages)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="splitMode"
                    value="ranges"
                    checked={splitMode === 'ranges'}
                    onChange={(e) => setSplitMode(e.target.value as 'all' | 'ranges')}
                    className="text-sm"
                  />
                  <span className="text-sm">Split by page ranges</span>
                </label>
              </div>
              
              {splitMode === 'ranges' && (
                <div className="space-y-2">
                  <label htmlFor="pageRanges" className="block text-sm font-medium">
                    Page Ranges
                  </label>
                  <input
                    id="pageRanges"
                    type="text"
                    value={pageRanges}
                    onChange={(e) => setPageRanges(e.target.value)}
                    placeholder="e.g., 1-5,7,9-12"
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-600">
                    Enter page ranges separated by commas. Examples: "1-5" (pages 1 to 5), "1,3,5" (individual pages), "1-3,8-10" (multiple ranges)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Compression level selection */}
          {operation === 'compress' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Compression Level</h3>
              <div className="space-y-2">
                {(['low', 'medium', 'high'] as CompressionLevel[]).map((level) => {
                  const info = getCompressionInfo(level);
                  return (
                    <label key={level} className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="compressionLevel"
                        value={level}
                        checked={compressionLevel === level}
                        onChange={(e) => setCompressionLevel(e.target.value as CompressionLevel)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{info.name}</div>
                        <div className="text-xs text-gray-600">{info.description}</div>
                        <div className="text-xs text-green-600">Est. reduction: {info.estimatedReduction}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Image to PDF options */}
          {operation === 'images-to-pdf' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Layout Options</h3>
              
              {/* Layout Mode */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Image Layout:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'fit', name: 'Fit', desc: 'Fit image within page (maintain aspect)' },
                    { key: 'fill', name: 'Fill', desc: 'Fill page (may crop, maintain aspect)' },
                    { key: 'stretch', name: 'Stretch', desc: 'Stretch to fill page (may distort)' },
                    { key: 'center', name: 'Center', desc: 'Center at original size' }
                  ].map((mode) => (
                    <label key={mode.key} className="flex items-start gap-2 p-2 border border-[#6b9080] rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="layoutMode"
                        value={mode.key}
                        checked={imageLayoutMode === mode.key}
                        onChange={(e) => setImageLayoutMode(e.target.value as ImageLayoutMode)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{mode.name}</div>
                        <div className="text-xs text-gray-600">{mode.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Orientation */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Page Orientation:</label>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="orientation"
                      value="portrait"
                      checked={pageOrientation === 'portrait'}
                      onChange={(e) => setPageOrientation(e.target.value as PageOrientation)}
                    />
                    <span className="text-sm">Portrait</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="orientation"
                      value="landscape"
                      checked={pageOrientation === 'landscape'}
                      onChange={(e) => setPageOrientation(e.target.value as PageOrientation)}
                    />
                    <span className="text-sm">Landscape</span>
                  </label>
                </div>
              </div>
              
              {/* Page Size */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Page Size:</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'a4', name: 'A4' },
                    { key: 'letter', name: 'Letter' },
                    { key: 'legal', name: 'Legal' },
                    { key: 'a3', name: 'A3' }
                  ].map((size) => (
                    <label key={size.key} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="pageSize"
                        value={size.key}
                        checked={pageSize === size.key}
                        onChange={(e) => setPageSize(e.target.value as PageSize)}
                      />
                      <span className="text-sm">{size.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <ul className="space-y-2">
            {files.map((lf, idx) => (
              <li key={lf.id}
                  className={`flex items-center group ${styles.fileItem}`}>
                <div className={styles.fileIconBox}>
                  <FileIcon size={18} />
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
              disabled={processing || (operation === 'merge' && files.length < 2)}
              className={`px-4 py-2 disabled:opacity-50 flex items-center gap-2 ${styles.primaryBtn}`}
            >
              <FileSymlink size={16} className={processing ? 'animate-pulse' : ''} />
              {processing ? 'Processing...' : 
                operation === 'merge' ? 'Merge PDFs' :
                operation === 'split' ? (splitMode === 'all' ? 'Split into Pages' : 'Split by Ranges') :
                operation === 'compress' ? 'Compress PDF' :
                'Generate PDF'}
            </button>
            <button
              onClick={clearAll}
              disabled={processing}
              className={`px-4 py-2 disabled:opacity-50 ${styles.outlineBtn}`}
            >
              Clear
            </button>
            {resultUrl && (
              <a
                href={resultUrl}
                download={
                  operation === 'merge' ? 'merged.pdf' :
                  operation === 'split' ? (splitMode === 'all' ? 'split-pages.zip' : 
                    pageRanges.split(',').length === 1 ? `pages-${pageRanges}.pdf` : 'split-ranges.zip') :
                  operation === 'compress' ? `compressed-${compressionLevel}.pdf` :
                  'output.pdf'
                }
                className={`px-4 py-2 flex items-center gap-2 ${styles.primaryBtn}`}
              >
                <Download size={16} /> Download
              </a>
            )}
          </div>
          
          {/* Compression Results */}
          {operation === 'compress' && compressionResults && (
            <p className={styles.operationCardDesc}>
              New size: {formatFileSize(compressionResults.compressedSize)}
            </p>
          )}
        </div>
      )}

      {operation && !files.length && (
        <p className={styles.formText}>No files added yet.</p>
      )}
      
      {operation === 'merge' && files.length === 1 && (
        <p className={styles.formText}>Add at least one more PDF file to merge.</p>
      )}
    </div>
  );
};

export default ToolsPage;
