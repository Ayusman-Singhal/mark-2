import React, { useCallback, useEffect, useRef, useState } from 'react';
import styling from '../../../styling.json';
import { Upload, Image as ImageIcon, X, ArrowUp, ArrowDown, Wand2, Crop, Paintbrush, Download, AlertCircle, Palette, FileText } from 'lucide-react';
import styles from './pdfTools.module.css';

type Operation = 'resize' | 'convert' | 'compress' | 'ocr' | 'crop' | 'filter' | 'watermark' | 'thumbnail';

interface LocalFile {
  id: string;
  file: File;
  preview?: string;
}

const ImageToolsPage: React.FC = () => {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrls, setResultUrls] = useState<Array<{ name: string; url: string }>>([]);
  const [extractedText, setExtractedText] = useState<string>('');
  
  // Resize options
  const [resizeWidth, setResizeWidth] = useState<number>(800);
  const [resizeHeight, setResizeHeight] = useState<number>(600);
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
  
  // Convert options
  const [convertFormat, setConvertFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [convertQuality, setConvertQuality] = useState<number>(90);
  
  // Compress options
  const [compressQuality, setCompressQuality] = useState<number>(80);
  
  // Crop options
  const [cropX, setCropX] = useState<number>(0);
  const [cropY, setCropY] = useState<number>(0);
  const [cropWidth, setCropWidth] = useState<number>(400);
  const [cropHeight, setCropHeight] = useState<number>(400);
  
  // Filter options
  const [filterType, setFilterType] = useState<'grayscale' | 'sepia' | 'blur' | 'brightness' | 'contrast' | 'invert'>('grayscale');
  const [filterIntensity, setFilterIntensity] = useState<number>(100);
  
  // Watermark options
  const [watermarkText, setWatermarkText] = useState<string>('© Copyright');
  const [watermarkPosition, setWatermarkPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'>('bottom-right');
  const [watermarkX, setWatermarkX] = useState<number>(10);
  const [watermarkY, setWatermarkY] = useState<number>(10);
  const [watermarkFontSize, setWatermarkFontSize] = useState<number>(24);
  
  // Thumbnail options
  const [thumbnailWidth, setThumbnailWidth] = useState<number>(200);
  const [thumbnailHeight, setThumbnailHeight] = useState<number>(200);
  
  const inputRef = useRef<HTMLInputElement | null>(null);

  const colors = styling.colors;

  const isImage = (f: File) => f.type.startsWith('image/');

  const validateFiles = useCallback((incoming: File[]): boolean => {
    if (!incoming.length) return false;
    return incoming.every(isImage);
  }, []);

  const onFiles = useCallback(async (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    if (!validateFiles(arr)) {
      setError('All files must be images (png/jpg/jpeg/webp/gif).');
      return;
    }
    setError(null);
    setResultUrls([]);
    
    const filesWithPreviews = await Promise.all(
      arr.map(async (file) => {
        const preview = await createPreview(file);
        return { id: crypto.randomUUID(), file, preview };
      })
    );
    
    setFiles(prev => [...prev, ...filesWithPreviews]);
  }, [validateFiles]);

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = e => {
    e.preventDefault();
    onFiles(e.dataTransfer.files);
  };
  
  const onDragOver: React.DragEventHandler<HTMLDivElement> = e => { 
    e.preventDefault(); 
  };

  const removeFile = (id: string) => {
    const file = files.find(f => f.id === id);
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
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
    files.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]); 
    setResultUrls([]); 
    setError(null);
    setExtractedText('');
    setResizeWidth(800);
    setResizeHeight(600);
    setMaintainAspect(true);
    setConvertFormat('png');
    setConvertQuality(90);
    setCompressQuality(80);
    setCropX(0);
    setCropY(0);
    setCropWidth(400);
    setCropHeight(400);
    setFilterType('grayscale');
    setFilterIntensity(100);
    setWatermarkText('© Copyright');
    setWatermarkX(10);
    setWatermarkY(10);
    setWatermarkFontSize(24);
    setThumbnailWidth(200);
    setThumbnailHeight(200);
  };

  const processResize = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        let width = resizeWidth;
        let height = resizeHeight;

        if (maintainAspect) {
          const aspectRatio = img.width / img.height;
          if (width / height > aspectRatio) {
            width = height * aspectRatio;
          } else {
            height = width / aspectRatio;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, file.type);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const processConvert = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        const mimeType = `image/${convertFormat}`;
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          mimeType,
          convertQuality / 100
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const processCompress = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          file.type,
          compressQuality / 100
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const processOCR = async (file: File): Promise<string> => {
    try {
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      return result.data.text;
    } catch (err: any) {
      throw new Error(`OCR failed: ${err.message}`);
    }
  };

  const processCrop = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        ctx?.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, file.type);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const processFilter = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        switch (filterType) {
          case 'grayscale':
            for (let i = 0; i < data.length; i += 4) {
              const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
              data[i] = data[i + 1] = data[i + 2] = avg;
            }
            break;
          case 'sepia':
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i], g = data[i + 1], b = data[i + 2];
              data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
              data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
              data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
            }
            break;
          case 'brightness':
            const brightnessFactor = (filterIntensity - 100) * 2.55;
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.max(0, Math.min(255, data[i] + brightnessFactor));
              data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightnessFactor));
              data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightnessFactor));
            }
            break;
          case 'contrast':
            const contrastFactor = (259 * (filterIntensity + 255)) / (255 * (259 - filterIntensity));
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.max(0, Math.min(255, contrastFactor * (data[i] - 128) + 128));
              data[i + 1] = Math.max(0, Math.min(255, contrastFactor * (data[i + 1] - 128) + 128));
              data[i + 2] = Math.max(0, Math.min(255, contrastFactor * (data[i + 2] - 128) + 128));
            }
            break;
          case 'invert':
            for (let i = 0; i < data.length; i += 4) {
              data[i] = 255 - data[i];
              data[i + 1] = 255 - data[i + 1];
              data[i + 2] = 255 - data[i + 2];
            }
            break;
        }

        ctx!.putImageData(imageData, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, file.type);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const processWatermark = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        ctx!.font = `${watermarkFontSize}px Arial`;
        ctx!.fillStyle = 'rgba(255, 255, 255, 0.7)';
        
        // Calculate position based on selected position
        let x = watermarkX;
        let y = watermarkY;
        const textWidth = ctx!.measureText(watermarkText).width;
        
        switch (watermarkPosition) {
          case 'top-left':
            x = 20;
            y = 40;
            break;
          case 'top-right':
            x = canvas.width - textWidth - 20;
            y = 40;
            break;
          case 'bottom-left':
            x = 20;
            y = canvas.height - 20;
            break;
          case 'bottom-right':
            x = canvas.width - textWidth - 20;
            y = canvas.height - 20;
            break;
          case 'center':
            x = (canvas.width - textWidth) / 2;
            y = canvas.height / 2;
            break;
        }
        
        ctx!.fillText(watermarkText, x, y);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, file.type);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const processThumbnail = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        const aspectRatio = img.width / img.height;
        let width = thumbnailWidth;
        let height = thumbnailHeight;

        // Maintain aspect ratio
        if (img.width / thumbnailWidth > img.height / thumbnailHeight) {
          height = thumbnailWidth / aspectRatio;
        } else {
          width = thumbnailHeight * aspectRatio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/jpeg', 0.8);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const process = async () => {
    if (!files.length) { 
      setError('Add at least one image file.'); 
      return; 
    }
    
    setProcessing(true); 
    setError(null); 
    setResultUrls([]);
    setExtractedText('');
    
    try {
      const results: Array<{ name: string; url: string }> = [];
      
      if (operation === 'ocr') {
        // OCR - extract text from images
        const textParts: string[] = [];
        for (const localFile of files) {
          const text = await processOCR(localFile.file);
          textParts.push(`=== ${localFile.file.name} ===\n\n${text}\n\n`);
        }
        setExtractedText(textParts.join('\n'));
      } else {
        // Other operations
        for (const localFile of files) {
          let blob: Blob;
          const originalName = localFile.file.name;
          const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
          
          switch (operation) {
            case 'resize':
              blob = await processResize(localFile.file);
              results.push({
                name: `${nameWithoutExt}_resized.${localFile.file.type.split('/')[1]}`,
                url: URL.createObjectURL(blob)
              });
              break;
              
            case 'convert':
              blob = await processConvert(localFile.file);
              results.push({
                name: `${nameWithoutExt}.${convertFormat}`,
                url: URL.createObjectURL(blob)
              });
              break;
              
            case 'compress':
              blob = await processCompress(localFile.file);
              results.push({
                name: `${nameWithoutExt}_compressed.${localFile.file.type.split('/')[1]}`,
                url: URL.createObjectURL(blob)
              });
              break;
              
            case 'crop':
              blob = await processCrop(localFile.file);
              results.push({
                name: `${nameWithoutExt}_cropped.${localFile.file.type.split('/')[1]}`,
                url: URL.createObjectURL(blob)
              });
              break;
              
            case 'filter':
              blob = await processFilter(localFile.file);
              results.push({
                name: `${nameWithoutExt}_${filterType}.${localFile.file.type.split('/')[1]}`,
                url: URL.createObjectURL(blob)
              });
              break;
              
            case 'watermark':
              blob = await processWatermark(localFile.file);
              results.push({
                name: `${nameWithoutExt}_watermarked.${localFile.file.type.split('/')[1]}`,
                url: URL.createObjectURL(blob)
              });
              break;
              
            case 'thumbnail':
              blob = await processThumbnail(localFile.file);
              results.push({
                name: `${nameWithoutExt}_thumb.jpg`,
                url: URL.createObjectURL(blob)
              });
              break;
              
            default:
              break;
          }
        }
      }
      
      setResultUrls(results);
    } catch (e: any) {
      setError(e.message || 'Processing failed.');
    } finally {
      setProcessing(false);
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
      link.download = 'processed-images.zip';
      link.click();
      URL.revokeObjectURL(url);
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
        <h1 className={styles.heading}>Image Toolkit</h1>
        <p className={styles.sub}>Fast local image operations. Files never leave your device.</p>
      </header>

      {!operation && (
        <section className="grid md:grid-cols-3 gap-6">
          {[
            { key: 'resize', title: 'Resize Images', desc: 'Change image dimensions while maintaining quality.', icon: <Crop size={20}/> },
            { key: 'convert', title: 'Convert Format', desc: 'Convert images between PNG, JPG, and WebP.', icon: <Palette size={20}/> },
            { key: 'compress', title: 'Compress Images', desc: 'Reduce file size with adjustable quality.', icon: <Wand2 size={20}/> },
            { key: 'ocr', title: 'Extract Text (OCR)', desc: 'Extract text from images using OCR.', icon: <FileText size={20}/> },
            { key: 'crop', title: 'Crop Images', desc: 'Crop images with custom coordinates and dimensions.', icon: <Crop size={20}/> },
            { key: 'filter', title: 'Apply Filters', desc: 'Apply filters like grayscale, sepia, brightness, and more.', icon: <Paintbrush size={20}/> },
            { key: 'watermark', title: 'Add Watermark', desc: 'Add text watermarks with custom positioning.', icon: <ImageIcon size={20}/> },
            { key: 'thumbnail', title: 'Create Thumbnails', desc: 'Generate thumbnails with custom dimensions.', icon: <ArrowDown size={20}/> }
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
          accept="image/*"
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          <div className={styles.dropIconWrap}>
            <Upload size={28} />
          </div>
          <p className="text-sm">
            <strong>Click to choose</strong> or drag & drop images here
          </p>
          <span className={styles.smallNote}>Supports PNG, JPG, WebP, and GIF</span>
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
          <FileText size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {operation && !!files.length && (
        <div className="space-y-4">
          {/* Resize options */}
          {operation === 'resize' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Resize Options</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="width" className="block text-sm font-medium mb-1">Width (px)</label>
                  <input
                    id="width"
                    type="number"
                    value={resizeWidth}
                    onChange={(e) => setResizeWidth(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                <div>
                  <label htmlFor="height" className="block text-sm font-medium mb-1">Height (px)</label>
                  <input
                    id="height"
                    type="number"
                    value={resizeHeight}
                    onChange={(e) => setResizeHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={maintainAspect}
                  onChange={(e) => setMaintainAspect(e.target.checked)}
                />
                <span className="text-sm">Maintain aspect ratio</span>
              </label>
            </div>
          )}

          {/* Convert options */}
          {operation === 'convert' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Conversion Options</h3>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Output Format:</label>
                <div className="flex gap-4">
                  {(['png', 'jpg', 'webp'] as const).map((format) => (
                    <label key={format} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="format"
                        value={format}
                        checked={convertFormat === format}
                        onChange={(e) => setConvertFormat(e.target.value as 'png' | 'jpg' | 'webp')}
                      />
                      <span className="text-sm uppercase">{format}</span>
                    </label>
                  ))}
                </div>
              </div>
              {convertFormat !== 'png' && (
                <div>
                  <label htmlFor="convertQuality" className="block text-sm font-medium mb-1">
                    Quality: {convertQuality}%
                  </label>
                  <input
                    id="convertQuality"
                    type="range"
                    min="1"
                    max="100"
                    value={convertQuality}
                    onChange={(e) => setConvertQuality(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}

          {/* Compress options */}
          {operation === 'compress' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Compression Options</h3>
              <div>
                <label htmlFor="compressQuality" className="block text-sm font-medium mb-1">
                  Quality: {compressQuality}%
                </label>
                <input
                  id="compressQuality"
                  type="range"
                  min="1"
                  max="100"
                  value={compressQuality}
                  onChange={(e) => setCompressQuality(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Lower quality = smaller file size
                </p>
              </div>
            </div>
          )}

          {/* Crop options */}
          {operation === 'crop' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Crop Options</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cropX" className="block text-sm font-medium mb-1">X Position (px)</label>
                  <input
                    id="cropX"
                    type="number"
                    value={cropX}
                    onChange={(e) => setCropX(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label htmlFor="cropY" className="block text-sm font-medium mb-1">Y Position (px)</label>
                  <input
                    id="cropY"
                    type="number"
                    value={cropY}
                    onChange={(e) => setCropY(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label htmlFor="cropWidth" className="block text-sm font-medium mb-1">Width (px)</label>
                  <input
                    id="cropWidth"
                    type="number"
                    value={cropWidth}
                    onChange={(e) => setCropWidth(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                <div>
                  <label htmlFor="cropHeight" className="block text-sm font-medium mb-1">Height (px)</label>
                  <input
                    id="cropHeight"
                    type="number"
                    value={cropHeight}
                    onChange={(e) => setCropHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Filter options */}
          {operation === 'filter' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Filter Options</h3>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Filter Type:</label>
                <div className="flex flex-wrap gap-3">
                  {(['grayscale', 'sepia', 'invert', 'brightness', 'contrast'] as const).map((filter) => (
                    <label key={filter} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="filter"
                        value={filter}
                        checked={filterType === filter}
                        onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                      />
                      <span className="text-sm capitalize">{filter}</span>
                    </label>
                  ))}
                </div>
              </div>
              {(filterType === 'brightness' || filterType === 'contrast') && (
                <div>
                  <label htmlFor="filterIntensity" className="block text-sm font-medium mb-1">
                    Intensity: {filterIntensity}%
                  </label>
                  <input
                    id="filterIntensity"
                    type="range"
                    min="0"
                    max="200"
                    value={filterIntensity}
                    onChange={(e) => setFilterIntensity(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}

          {/* Watermark options */}
          {operation === 'watermark' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Watermark Options</h3>
              <div>
                <label htmlFor="watermarkText" className="block text-sm font-medium mb-1">Watermark Text</label>
                <input
                  id="watermarkText"
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="Enter watermark text"
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Position:</label>
                <div className="flex flex-wrap gap-3">
                  {(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] as const).map((pos) => (
                    <label key={pos} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="position"
                        value={pos}
                        checked={watermarkPosition === pos}
                        onChange={(e) => setWatermarkPosition(e.target.value as typeof watermarkPosition)}
                      />
                      <span className="text-sm capitalize">{pos.replace('-', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Thumbnail options */}
          {operation === 'thumbnail' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Thumbnail Options</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="thumbWidth" className="block text-sm font-medium mb-1">Max Width (px)</label>
                  <input
                    id="thumbWidth"
                    type="number"
                    value={thumbnailWidth}
                    onChange={(e) => setThumbnailWidth(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="50"
                  />
                </div>
                <div>
                  <label htmlFor="thumbHeight" className="block text-sm font-medium mb-1">Max Height (px)</label>
                  <input
                    id="thumbHeight"
                    type="number"
                    value={thumbnailHeight}
                    onChange={(e) => setThumbnailHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="50"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-600">Maintains aspect ratio while fitting within dimensions</p>
            </div>
          )}

          <ul className="space-y-2">
            {files.map((lf, idx) => (
              <li key={lf.id}
                  className={`flex items-center group ${styles.fileItem}`}>
                <div className={styles.fileIconBox}>
                  <ImageIcon size={18} />
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
              <Paintbrush size={16} className={processing ? 'animate-pulse' : ''} />
              {processing ? 'Processing...' : 
                operation === 'resize' ? 'Resize Images' :
                operation === 'convert' ? 'Convert Images' :
                operation === 'ocr' ? 'Extract Text (OCR)' :
                'Compress Images'}
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
              <h3 className="text-sm font-medium">Processed Images:</h3>
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
                <h3 className="text-sm font-medium">Extracted Text (OCR):</h3>
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
        </div>
      )}

      {operation && !files.length && (
        <p className={styles.formText}>No images added yet.</p>
      )}
    </div>
  );
};

export default ImageToolsPage;
