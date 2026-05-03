import React, { useState, useRef } from 'react';
import { DeviceCategory } from '../types';
import { runForensicAudit } from '../services/geminiService';
import { supabaseService } from '../services/supabaseService';
import { cacheService } from '../services/cacheService';
import { useApp } from '../providers/AppProvider';
import { AppError, logError } from '../utils/errors';
import { compressImage } from '../utils/imageUtils';
import { findNearbyRepairShops } from '../services/placesService';
import { canScan, recordScan, getScansUsedToday, getDailyLimit, timeUntilReset } from '../services/scanLimitService';
import ToastNotification from './ToastNotification';

const CATEGORY_ICONS: Record<DeviceCategory, string> = {
  [DeviceCategory.PHONE]:     'smartphone',
  [DeviceCategory.LAPTOP]:    'laptop',
  [DeviceCategory.TABLET]:    'tablet',
  [DeviceCategory.CONSOLE]:   'sports_esports',
  [DeviceCategory.DESKTOP]:   'computer',
  [DeviceCategory.APPLIANCE]: 'kitchen',
  [DeviceCategory.OTHER]:     'devices_other',
};

const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

const DiagnosticForm: React.FC<{ onSuccess: (log: unknown) => void; onCancel: () => void }> = ({ onSuccess, onCancel }) => {
  const { refreshState, user, setShowPremiumModal } = useApp();
  const [analyzing, setAnalyzing] = useState(false);
  const [isMobile] = useState(isTouchDevice);
  const [images, setImages] = useState<string[]>([]);
  const [category, setCategory] = useState<DeviceCategory>(DeviceCategory.PHONE);
  const [desc, setDesc] = useState('');
  const [manualName, setManualName] = useState('');
  const [status, setStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Two separate hidden file inputs — one with capture for camera, one without for gallery
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const readFiles = (files: FileList | null) => {
    if (!files) return;
    const slots = 5 - images.length;
    const toRead = Math.min(files.length, slots);
    for (let i = 0; i < toRead; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setImages(prev => [...prev, compressed]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudit = async () => {
    if (images.length === 0) return;
    if (!canScan(user?.is_premium ?? false)) {
      setErrorMsg(`Daily limit reached — resets in ${timeUntilReset()}. Upgrade to Pro for 250 scans/day.`);
      return;
    }
    setErrorMsg(null);
    setAnalyzing(true);
    recordScan();

    let location: { latitude: number; longitude: number } | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true,
          maximumAge: 0,
        })
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
        // Run AI analysis and Places lookup in parallel
        setStatus('Identifying your device…');
        const [aiResult, nearbyShops] = await Promise.all([
          runForensicAudit(category, desc, images, location, manualName),
          location ? findNearbyRepairShops(location.latitude, location.longitude) : Promise.resolve([]),
        ]);
        result = aiResult;
        // Replace AI-hallucinated shops with real Places API results
        if (nearbyShops.length > 0) {
          result.recommended_repair_hubs = nearbyShops.map(s => ({
            name: s.name,
            address: s.address,
            uri: s.uri,
            rating: s.rating ? `${s.rating} ★ (${s.reviewCount})` : '',
            specialty: s.isOpenNow === true ? 'Open now' : s.isOpenNow === false ? 'Closed now' : '',
          }));
        }
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
      } else if (e instanceof Error) {
        if (e.message.includes('429'))    msg = 'DeviceLens is busy — please try again in a minute.';
        else if (e.message.includes('timed out')) msg = 'Analysis timed out — please try again.';
        else msg = e.message.slice(0, 140);
      }
      setAnalyzing(false);
      setErrorMsg(msg);
    }
  };

  /* ── ANALYZING OVERLAY ─────────────────────────────────────────────────────── */
  if (analyzing) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-10 text-center gap-6 page-enter">
      <div className="relative w-20 h-20">
        <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-accent/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary dark:text-accent text-4xl">auto_awesome</span>
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 dark:border-accent/20 border-t-primary dark:border-t-accent animate-spin" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-dl-dt">Looking at your device…</h2>
        <p className="text-sm text-gray-500 dark:text-dl-dt2 mt-1">{status}</p>
      </div>
      <p className="text-xs text-gray-400 dark:text-dl-dt2">Usually done in under 15 seconds</p>
    </div>
  );

  /* ── INTAKE FORM ───────────────────────────────────────────────────────────── */
  return (
    <div className="page-enter p-5 pb-40 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-dl-dt tracking-tight">What's broken?</h2>
          <p className="text-sm text-gray-400 dark:text-dl-dt2 mt-0.5">Show us a photo and we'll figure it out</p>
        </div>
        <button onClick={onCancel} className="text-sm text-gray-400 dark:text-dl-dt2 hover:text-gray-700 dark:hover:text-dl-dt font-medium transition-colors">
          Cancel
        </button>
      </div>

      {/* Error toast */}
      {errorMsg && (
        <ToastNotification message={errorMsg} type="error" onDismiss={() => setErrorMsg(null)} />
      )}

      {/* ── PHOTOS ─────────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-dl-dt flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-primary dark:text-accent">photo_library</span>
          Photos
          <span className="text-xs font-normal text-gray-400 dark:text-dl-dt2">(up to 5)</span>
        </p>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 items-start">

          {/* Existing photo thumbnails */}
          {images.map((img, i) => (
            <div key={i} className="relative shrink-0 w-24 h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-dl-dark-b shadow-soft group">
              <img src={img} className="w-full h-full object-cover" alt={`Device photo ${i + 1}`} />
              <button
                onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-600 transition-all"
              >
                <span className="material-symbols-outlined text-sm leading-none">close</span>
              </button>
            </div>
          ))}

          {/* Add-photo buttons — only show while under limit */}
          {images.length < 5 && (
            <>
              {/* CAMERA button — only shown on touch/mobile devices where capture="environment" opens the camera app */}
              {isMobile && (
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  aria-label="Take a photo"
                  className="
                    shrink-0 w-24 h-32 rounded-xl border-2 border-dashed
                    border-gray-200 dark:border-dl-dark-b
                    flex flex-col items-center justify-center gap-2
                    hover:border-primary dark:hover:border-accent
                    hover:bg-primary/5 dark:hover:bg-accent/5
                    text-gray-400 dark:text-dl-dt2
                    hover:text-primary dark:hover:text-accent
                    transition-all active:scale-95
                  "
                >
                  <span className="material-symbols-outlined text-3xl">photo_camera</span>
                  <span className="text-[10px] font-semibold leading-tight text-center px-1">Take Photo</span>
                </button>
              )}

              {/* GALLERY / file upload button — always visible */}
              <button
                onClick={() => galleryInputRef.current?.click()}
                aria-label="Choose from gallery or files"
                className="
                  shrink-0 w-24 h-32 rounded-xl border-2 border-dashed
                  border-gray-200 dark:border-dl-dark-b
                  flex flex-col items-center justify-center gap-2
                  hover:border-success dark:hover:border-success-d
                  hover:bg-green-50 dark:hover:bg-success-d/5
                  text-gray-400 dark:text-dl-dt2
                  hover:text-success dark:hover:text-success-d
                  transition-all active:scale-95
                "
              >
                <span className="material-symbols-outlined text-3xl">upload_file</span>
                <span className="text-[10px] font-semibold leading-tight text-center px-1">Upload</span>
              </button>
            </>
          )}
        </div>

        {/* Hidden native file inputs */}
        {/* Camera: capture="environment" triggers rear camera on mobile */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => { readFiles(e.target.files); e.target.value = ''; }}
        />
        {/* Gallery: no capture, allows picking from files/gallery */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { readFiles(e.target.files); e.target.value = ''; }}
        />
      </section>

      {/* ── DEVICE TYPE ──────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-dl-dt flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-primary dark:text-accent">devices</span>
          Device type
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.values(DeviceCategory) as DeviceCategory[]).map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
              className={`
                flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all
                ${category === cat
                  ? 'bg-primary/5 dark:bg-accent/10 border-primary dark:border-accent shadow-soft'
                  : 'bg-white dark:bg-dl-dark-s border-gray-200 dark:border-dl-dark-b hover:border-primary/40 dark:hover:border-accent/30'
                }
              `}
            >
              <span className={`material-symbols-outlined text-xl ${category === cat ? 'text-primary dark:text-accent' : 'text-gray-400 dark:text-dl-dt2'}`}>
                {CATEGORY_ICONS[cat]}
              </span>
              <span className={`text-xs font-medium ${category === cat ? 'text-primary dark:text-accent' : 'text-gray-700 dark:text-dl-dt'}`}>
                {cat}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── ISSUE DESCRIPTION ───────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-dl-dt flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-primary dark:text-accent">description</span>
          Describe the issue
          <span className="text-xs font-normal text-gray-400 dark:text-dl-dt2">(optional but helpful)</span>
        </label>
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="e.g. Screen cracked, won't turn on, battery drains very fast…"
          rows={3}
          className="
            w-full rounded-xl border border-gray-200 dark:border-dl-dark-b
            bg-white dark:bg-dl-dark-s
            text-gray-900 dark:text-dl-dt text-sm
            placeholder:text-gray-300 dark:placeholder:text-dl-dt2/50
            px-4 py-3 outline-none resize-none
            focus:border-primary dark:focus:border-accent
            focus:ring-2 focus:ring-primary/10 dark:focus:ring-accent/10
            transition-colors
          "
        />
      </section>

      {/* ── DEVICE NAME (OPTIONAL) ───────────────────────────────────────────────── */}
      <section className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-dl-dt flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-primary dark:text-accent">badge</span>
          Device name
          <span className="text-xs font-normal text-gray-400 dark:text-dl-dt2">(speeds up analysis)</span>
        </label>
        <input
          type="text"
          value={manualName}
          onChange={e => setManualName(e.target.value)}
          placeholder="e.g. iPhone 15 Pro Max, Samsung Galaxy S24…"
          className="
            w-full rounded-xl border border-gray-200 dark:border-dl-dark-b
            bg-white dark:bg-dl-dark-s
            text-gray-900 dark:text-dl-dt text-sm
            placeholder:text-gray-300 dark:placeholder:text-dl-dt2/50
            px-4 py-3 outline-none
            focus:border-primary dark:focus:border-accent
            focus:ring-2 focus:ring-primary/10 dark:focus:ring-accent/10
            transition-colors
          "
        />
      </section>

      {/* ── SUBMIT ──────────────────────────────────────────────────────────────── */}
      <div className="space-y-2 pt-2">
        {/* Scan counter */}
        {(() => {
          const used = getScansUsedToday();
          const limit = getDailyLimit(user?.is_premium ?? false);
          const remaining = limit - used;
          const nearLimit = remaining <= 3 && remaining > 0;
          const atLimit = remaining <= 0;
          return (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-gray-400 dark:text-dl-dt2">
                {atLimit
                  ? `Limit reached · resets in ${timeUntilReset()}`
                  : `${remaining} of ${limit} scans left today`}
              </p>
              {nearLimit && !user?.is_premium && (
                <button
                  onClick={() => setShowPremiumModal(true)}
                  className="text-xs font-semibold text-primary dark:text-accent hover:underline"
                >
                  Go Pro →
                </button>
              )}
            </div>
          );
        })()}

        {images.length === 0 && (
          <p className="text-center text-xs text-gray-400 dark:text-dl-dt2 font-medium">
            Add at least one photo to start
          </p>
        )}
        <button
          disabled={images.length === 0 || !canScan(user?.is_premium ?? false)}
          onClick={handleAudit}
          className="
            w-full py-4 rounded-xl font-bold text-base text-white
            bg-primary hover:bg-primary-700
            dark:bg-accent dark:text-dl-dark dark:hover:bg-blue-300
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
