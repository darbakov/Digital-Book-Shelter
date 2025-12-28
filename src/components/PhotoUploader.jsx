import React, { useState, useRef, useEffect } from 'react';

// Импорты
import { useCamera } from '../hooks/useCamera';
import { useSidebarResize } from '../hooks/useSidebarResize';
import { Icons } from './Icons';
import { LANGUAGES } from '../data/constants';
import '../styles/PhotoUploader.css'; // Подключаем CSS

const PhotoUploader = () => {
  // --- States ---
  const [theme, setTheme] = useState('light');
  const [currentStep, setCurrentStep] = useState('upload');
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const [language, setLanguage] = useState('ru');
  const [formData, setFormData] = useState({ 
    title: '', 
    author: '', 
    year: '', 
    text: '' 
});
  
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isMobileInputFocused, setIsMobileInputFocused] = useState(false);
  
  // Refs
  const blurTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- Helpers ---
  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const processFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setCurrentStep('upload');
    } else {
      showToast('error', 'Пожалуйста, выберите файл изображения');
    }
  };

  // --- Hooks ---
  const { 
      videoRef, 
      isActive: isCameraOpen, 
      isInitializing: isCameraLoading, 
      startCamera, 
      stopCamera, 
      capturePhoto 
  } = useCamera(processFile, (msg) => showToast('error', msg));
  
  const { width: sidebarWidth, isResizing, startResize } = useSidebarResize(360);

  // --- Handlers ---
  const handleNextStep = () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setTimeout(() => {
      setFormData({ title: "Документ #1", author: "Неизвестен", year: "2024" });
      setIsProcessing(false);
      setCurrentStep('review');
    }, 1500);
  };

  const handleSubmit = () => {
    setIsProcessing(true);
    setTimeout(() => {
      console.log("Submit:", formData);
      setIsProcessing(false);
      showToast('success', '✅ Сохранено!');
      setIsMobileInputFocused(false);
    }, 1000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Focus Logic
  const handleFocus = (e) => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    if (window.innerWidth <= 768) {
      setIsMobileInputFocused(true);
      setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  };

  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => setIsMobileInputFocused(false), 150);
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Drag & Drop
  const handleDragOver = (e) => { e.preventDefault(); setIsDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragActive(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragActive(false); processFile(e.dataTransfer.files[0]); };

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) processFile(items[i].getAsFile());
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // --- Render ---
  return (
    <div className={`app-layout step-${currentStep} ${isMobileInputFocused ? 'input-focused' : ''}`} data-theme={theme}>
        
        {toastMessage && <div className={`toast ${toastMessage.type}`}>{toastMessage.text}</div>}
        
        <div className="mobile-theme-btn" style={{display: window.innerWidth > 768 ? 'none' : 'block'}} onClick={toggleTheme}>
           {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
        </div>

        {/* --- SIDEBAR --- */}
        <div className="sidebar" style={{ width: window.innerWidth > 768 ? sidebarWidth : '100%' }}>
          <div className={`resizer-handle ${isResizing ? 'active' : ''}`} onMouseDown={startResize}></div>
          <div className="sheet-handle" onClick={() => setIsMobileInputFocused(false)}></div>
          
          <div className="header">
            <div className="brand">Цифровой <br/> Книжный Приют</div>
            <button className="theme-btn" onClick={toggleTheme}>
              {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
            </button>
          </div>

          {currentStep === 'upload' ? (
            <>
              <input type="file" ref={fileInputRef} hidden onChange={e => processFile(e.target.files[0])} accept="image/*" />
              
              {!selectedFile && !isCameraOpen ? (
                <div className="action-grid">
                  <div className="btn-action" onClick={() => fileInputRef.current.click()}>
                    <Icons.Folder /> <span>Файл</span>
                  </div>
                  <div className="btn-action" onClick={startCamera}>
                    <Icons.Camera /> <span>Камера</span>
                  </div>
                </div>
              ) : selectedFile ? (
                <div className="file-card">
                  <div style={{fontWeight:600, fontSize:14}}>{selectedFile.name}</div>
                  <div style={{color:'var(--text-sec)', fontSize:12}}>{(selectedFile.size/1024/1024).toFixed(2)} MB</div>
                </div>
              ) : (
                 <div className="file-card" style={{justifyContent:'center', color:'var(--primary)', borderColor:'var(--primary)'}}>
                   📷 Камера активна...
                 </div>
              )}

              <div>
                <div className="label" style={{marginBottom:8, marginTop: 10}}>Язык перевода</div>
                <div className="lang-list">
                  {LANGUAGES.map(l => (
                    <div key={l.code} className={`lang-item ${language === l.code ? 'active' : ''}`} onClick={() => setLanguage(l.code)}>
                      <span style={{marginRight:8}}>{l.flag}</span> {l.label}
                      {language === l.code && window.innerWidth > 768 && <span style={{fontSize:10}}>●</span>}
                    </div>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleNextStep} disabled={!selectedFile || isProcessing}>
                {isProcessing ? 'Обработка...' : 'Далее'}
              </button>
            </>
          ) : (
            <>
              <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:5}}>
                <button className="btn btn-secondary" onClick={() => setCurrentStep('upload')} style={{padding:8}}>
                  <Icons.Back />
                </button>
                <div style={{fontSize:16, fontWeight:700}}>Проверка данных</div>
              </div>
              
              <div className="form-group">
                <div className="label">Название</div>
                <input className="input-field" name="title" value={formData.title} onChange={handleInputChange} onFocus={handleFocus} onBlur={handleBlur} />
              </div>
              <div className="form-group">
                <div className="label">Автор</div>
                <input className="input-field" name="author" value={formData.author} onChange={handleInputChange} onFocus={handleFocus} onBlur={handleBlur} />
              </div>
              <div className="form-group">
                <div className="label">Год издания</div>
                <input className="input-field" name="year" type="number" value={formData.year} onChange={handleInputChange} onFocus={handleFocus} onBlur={handleBlur} />
              </div>
                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="label">Остальной текст</div>
                    <textarea 
                        className="input-field textarea-field" 
                        name="text" 
                        value={formData.text} 
                        onChange={handleInputChange} 
                        onFocus={handleFocus} 
                        onBlur={handleBlur}
                        placeholder="Распознанный текст будет здесь..."
                    />
              </div>

              <button className="btn btn-primary" onClick={handleSubmit} disabled={isProcessing} style={{marginBottom: isMobileInputFocused ? 20 : 0}}>
                {isProcessing ? 'Сохранение...' : 'Отправить'}
              </button>
            </>
          )}
        </div>

        {/* --- MAIN AREA --- */}
        <div className="main-area">
          {isCameraLoading ? (
             <div style={{color: 'var(--text-sec)', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <div className="spinner" style={{
                    width: 40, height: 40, border: '4px solid var(--border)', 
                    borderTopColor: 'var(--primary)', borderRadius: '50%', 
                    animation: 'spin 1s linear infinite', marginBottom: 15
                }}></div>
                <div>Запуск камеры...</div>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : isCameraOpen ? (
            <div className="camera-container">
              <video ref={videoRef} autoPlay playsInline muted></video>
              <div className="cam-close" onClick={stopCamera}><Icons.Close /></div>
              <div className="shutter-btn" onClick={capturePhoto}></div>
            </div>
          ) : previewUrl ? (
            <div className="img-wrap">
                <img src={previewUrl} className="preview-img" alt="preview" />
                {currentStep === 'upload' && (
                  <div className="preview-close" onClick={() => {setSelectedFile(null); setPreviewUrl(null); setCurrentStep('upload'); }}>
                    <Icons.Close />
                  </div>
                )}
            </div>
          ) : (
            <div 
                className={`drop-zone ${isDragActive ? 'active' : ''}`} 
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} 
                onClick={() => fileInputRef.current.click()}
            >
              <Icons.Upload />
              <div style={{marginTop:15, fontWeight:600, color:'var(--text)'}}>Перетащите фото</div>
              <div style={{fontSize:13, marginTop:5, color:'var(--text-sec)'}}>или выберите в меню</div>
            </div>
          )}
        </div>
      </div>
  );
};

export default PhotoUploader;
