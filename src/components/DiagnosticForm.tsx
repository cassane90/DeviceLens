import React, { useState, useRef } from 'react';
import { DeviceCategory } from '../types';
import { runForensicAudit } from '../services/geminiService';
import { supabaseService } from '../services/supabaseService';
import { cacheService } from '../services/cacheService';
import { useApp } from '../providers/AppProvider';
import { AppError, logError } from '../utils/errors';
import ToastNotification from './ToastNotification';

const CATEGORY_ICONS: Record<DeviceCategory, string> = {
  [DeviceCategory.PHONE]:    'smartphone',
  [DeviceCategory.LAPTOP]:   'laptop',
  [DeviceCategory.TABLET]:   'tablet',
  [DeviceCategory.CONSOLE]:  'sports_esports',
  [DeviceCategory.DESKTOP]:  'computer',
  [DeviceCategory.APPLIANCE]:'kitchen',
  [DeviceCategory.OTHER]:    'devices_other',
};

type Step = 'intake' | 'camera' | 'analyzing';

const DiagnosticForm: React.FC<{ onSuccess: (log: unknown) => void; onCancel: () => void }> = ({ onSuccess, onCancel }) => {
  const { refreshState } = useApp();
  const [step, setStep] = useState<Step>('intake');
  const [images, setImages] = useState<string[]>([]);
  const [category, setCategory] = useState<DeviceCategory>(DeviceCategory.PHONE);
  const [desc, setDesc] = useState('');
  const [manualName, setManualName] = useState('');
  const [status, setStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    setStep('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setErrorMsg('Camera not available. Please upload a photo instead.');
      setStep('intake');
    }
  };

  const capture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    setImages(prev => [...prev, canvas.toDataURL('image/jpeg', 0.8)]);
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setStep('intake');
  };

  const cancelCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) stream.getTracks().forEach(t => t.stop());
    }
    setStep('intake');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length && images.length + i < 5; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onloadend = () => setImages(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleAudit = async () => {
    if (images.length === 0) return;
    setErrorMsg(null);
    setStep('analyzing');

    let location: { latitude: number; longitude: number } | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, enableHighAccuracy: false })
      );
      location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch { /* proceed without location */ }

    const cached = cacheService.get(category, desc, images, location?.latitude, location?.longitude);

    try {
      let result;
      if (cached) {
        setStatus('Loading saved results…');
        result = cached;
      } else {
        setStatus('Analyzing your device with AI…');
        result = await runForensicAudit(category, desc, images, location, manualName);
        cacheService.set(category, desc, images, result, location?.latitude, location?.longitude);
      }
      setStatus('Saving…');
      const log = await supabaseService.saveLog(category, desc, images, result);
      await refreshState();
      onSuccess(log);
    } catch (e) {
      logError(e, 'DiagnosticForm.handleAudit');
      let msg = 'Analysis failed. Please try again.';
      if (e instanceof AppError) {
        msg = e.userMessage;
      } else if (e instanceof Error && e.message.includes('429')) {
        msg = 'DeviceLens is at capacity. Please try again in a minute.';
      }
      setStep('intake');
      setErrorMsg(msg);
    }
  };

  /* ── ANALYZING SCREEN ──────────���───────────────────────────────────────────── */
  if (step === 'analyzing') return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-10 text-center gap-6 page-enter">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-accent/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary dark:text-accent text-4xl">auto_awesome</span>
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 dark:border-accent/30 border-t-primary dark:border-t-accent animate-spin" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-dl-dt">Analyzing device</h2>
        <p className="text-sm text-gray-500 dark:text-dl-dt2 mt-1">{status}</p>
      </div>
      <p className="text-xs text-gray-400 dark:text-dl-dt2 max-w-[200px]">This usually takes 15–30 seconds</p>
    </div>
  );

  /* ── CAMERA SCREEN ─────────────────���──────────────────────────���────────────── */
  if (step === 'camera') return (
    <div className="fixed inset-0 bg-black z-[300] flex flex-col">
      <div className="relative flex-1">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <div className="crosshair-h" />
        <div className="crosshair-v" />
        <div className="absolute inset-0 border-[2px] border-white/10 m-8 rounded-xl pointer-events-none" />
      </div>
      <div className="h-44 bg-black/90 flex flex-col items-center justify-center gap-3 px-6">
        <button
          onClick={capture}
          aria-label="Capture"
          className="w-18 h-18 rounded-full border-4 border-white p-1 active:scale-90 transition-all"
        >
          <div className="w-full h-full bg-white rounded-full" />
        </button>
        <p className="text-sm text-white/70 font-medium">Tap to capture</p>
        <button onClick={cancelCamera} className="text-sm text-white/40 hover:text-white transition-colors">Cancel</button>
      </div>
    </div>
  );

  /* ── INTAKE FORM ─────────────────────���────────────────────────���────────────── */
  return (
    <div className="page-enter p-5 pb-40 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-dl-dt tracking-tight">What's the issue?</h2>
          <p className="text-sm text-gray-400 dark:text-dl-dt2 mt-0.5">Add photos and describe the problem</p>
        </div>
        <button onClick={onCancel} className="text-sm text-gray-400 dark:text-dl-dt2 hover:text-gray-600 dark:hover:text-dl-dt font-medium transition-colors">
          Cancel
        </button>
      </div>

      {/* Error */}
      {errorMsg && (
        <ToastNotification message={errorMsg} type="error" onDismiss={() => setErrorMsg(null)} />
      )}

      {/* ── Photos ── */}
      <section className="space-y-3">
        <label className="text-sm font-semibold text-gray-700 dark:text-dl-dt flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-primary dark:text-accent">photo_camera</span>
          Photos
          <span className="text-gray-400 dark:text-dl-dt2 font-normal text-xs">(up to 5)</span>
        </label>

        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {/* Existing photos */}
          {images.map((img, i) => (
            <div key={i} className="relative w-24 h-32 shrink-0 rounded-xl overflow-hidden border border-gray-200 dark:border-dl-dark-b shadow-soft group">
              <img src={img} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
              <button
                onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </div>
          ))}

          {/* Add buttons (show if < 5 photos) */}
          {images.length < 5 && (
            <>
              <button
                onClick={startCamera}
                aria-label="Take a photo"
                className="
                  w-24 h-32 shrink-0 rounded-xl border-2 border-dashed
                  border-gray-200 dark:border-dl-dark-b
                  flex flex-col items-center justify-center gap-1.5
                  hover:border-primary dark:hover:border-accent hover:bg-primary/5 dark:hover:bg-accent/5
                  text-gray-400 dark:text-dl-dt2 hover:text-primary dark:hover:text-accent
                  transition-all
                "
              >
                <span className="material-symbols-outlined text-2xl">photo_camera</span>
                <span className="text-[10px] font-semibold text-center leading-tight px-1">Camera</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload photo"
                className="
                  w-24 h-32 shrink-0 rounded-xl border-2 border-dashed
                  border-gray-200 dark:border-dl-dark-b
                  flex flex-col items-center justify-center gap-1.5
                  hover:border-success dark:hover:border-success-d hover:bg-green-50 dark:hover:bg-success-d/5
                  text-gray-400 dark:text-dl-dt2 hover:text-success dark:hover:text-success-d
                  transition-all
                "
              >
                <span className="material-symbols-outlined text-2xl">upload</span>
                <span className="text-[10px] font-semibold text-center leading-tight px-1">Upload</span>
              </button>
            </>
          )}
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
        </div>
      </section>

      {/* ── Device type ── */}
      <section className="space-y-3">
        <label className="text-sm font-semibold text-gray-700 dark:text-dl-dt flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-primary dark:text-accent">devices</span>
          Device type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.values(DeviceCategory) as DeviceCategory[]).map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
              className={`
                flex items-center gap-2.5 p-3 rounded-xl border text-left text-sm font-medium transition-all
                ${category === cat
                  ? 'bg-primary/5 dark:bg-accent/10 border-primary dark:border-accent text-primary dark:text-accent shadow-soft'
                  : 'bg-white dark:bg-dl-dark-s border-gray-200 dark:border-dl-dark-b text-gray-700 dark:text-dl-dt hover:border-primary/40 dark:hover:border-accent/30'
                }
              `}
            >
              <span className={`material-symbols-outlined text-xl ${category === cat ? 'text-primary dark:text-accent' : 'text-gray-400 dark:text-dl-dt2'}`}>
                {CATEGORY_ICONS[cat]}
              </span>
              <span className="text-xs">{cat}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Issue description ── */}
      <section className="space-y-3">
        <label className="text-sm font-semibold text-gray-700 dark:text-dl-dt flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-primary dark:text-accent">description</span>
          Describe the issue
          <span className="text-gray-400 dark:text-dl-dt2 font-normal text-xs">(optional but helpful)</span>
        </label>
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="e.g. Screen cracked, won't turn on, battery drains fast…"
          rows={3}
          className="
            w-full rounded-xl border border-gray-200 dark:border-dl-dark-b
            bg-white dark:bg-dl-dark-s
            text-gray-900 dark:text-dl-dt text-sm
            placeholder:text-gray-300 dark:placeholder:text-dl-dt2/60
            px-4 py-3 outline-none
            focus:border-primary dark:focus:border-accent
            focus:ring-2 focus:ring-primary/10 dark:focus:ring-accent/10
            resize-none transition-colors
          "
        />
      </section>

      {/* ── Optional device name ── */}
      <section className="space-y-3">
        <label className="text-sm font-semibold text-gray-700 dark:text-dl-dt flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-primary dark:text-accent">badge</span>
          Device name
          <span className="text-gray-400 dark:text-dl-dt2 font-normal text-xs">(optional — speeds up analysis)</span>
        </label>
        <input
          type="text"
          value={manualName}
          onChange={e => setManualName(e.target.value)}
          placeholder="e.g. iPhone 15 Pro Max"
          className="
            w-full rounded-xl border border-gray-200 dark:border-dl-dark-b
            bg-white dark:bg-dl-dark-s
            text-gray-900 dark:text-dl-dt text-sm
            placeholder:text-gray-300 dark:placeholder:text-dl-dt2/60
            px-4 py-3 outline-none
            focus:border-primary dark:focus:border-accent
            focus:ring-2 focus:ring-primary/10 dark:focus:ring-accent/10
            transition-colors
          "
        />
      </section>

      {/* ── Submit ── */}
      <div className="space-y-2 pt-2">
        {images.length === 0 && (
          <p className="text-center text-xs text-gray-400 dark:text-dl-dt2 font-medium">
            Add at least one photo to continue
          </p>
        )}
        <button
          disabled={images.length === 0}
          onClick={handleAudit}
          className="
            w-full py-4 rounded-xl font-bold text-base text-white
            bg-primary hover:bg-primary-700 dark:bg-accent dark:text-dl-dark dark:hover:bg-blue-300
            shadow-card dark:shadow-glow
            disabled:opacity-30 disabled:cursor-not-allowed
            active:scale-[0.98] transition-all
          "
        >
          Analyze Device
        </button>
      </div>
    </div>
  );
};

export default DiagnosticForm;
