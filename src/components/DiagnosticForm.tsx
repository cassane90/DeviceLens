import React, { useRef, useState } from "react";
import { DeviceCategory, QueryRecord } from "../types";
import { runForensicAudit } from "../services/geminiService";
import { findRepairGuides } from "../services/repairGuideService";
import { cacheService } from "../services/cacheService";
import { useApp } from "../providers/AppProvider";
import { compressImage } from "../utils/imageUtils";
import ToastNotification from "./ToastNotification";

const CATEGORY_ICONS: Record<DeviceCategory, string> = {
  [DeviceCategory.PHONE]: "smartphone",
  [DeviceCategory.LAPTOP]: "laptop",
  [DeviceCategory.TABLET]: "tablet",
  [DeviceCategory.CONSOLE]: "sports_esports",
  [DeviceCategory.DESKTOP]: "computer",
  [DeviceCategory.APPLIANCE]: "kitchen",
  [DeviceCategory.OTHER]: "devices_other",
};

const isTouchDevice = () => "ontouchstart" in window || navigator.maxTouchPoints > 0;

const DiagnosticForm: React.FC<{
  onSuccess: (log: QueryRecord) => void;
  onCancel: () => void;
}> = ({ onSuccess, onCancel }) => {
  const { saveHistory } = useApp();
  const [analyzing, setAnalyzing] = useState(false);
  const [isMobile] = useState(isTouchDevice);
  const [images, setImages] = useState<string[]>([]);
  const [category, setCategory] = useState<DeviceCategory>(DeviceCategory.PHONE);
  const [description, setDescription] = useState("");
  const [manualName, setManualName] = useState("");
  const [status, setStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const readFiles = (files: FileList | null) => {
    if (!files) return;

    const remaining = Math.max(0, 5 - images.length);
    const selected = Array.from(files).slice(0, remaining);

    selected.forEach(file => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const value = reader.result;
        if (typeof value !== "string") return;
        const compressed = await compressImage(value);
        setImages(current => current.length >= 5 ? current : [...current, compressed]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAudit = async () => {
    if (images.length === 0 || analyzing) return;

    setErrorMsg(null);
    setAnalyzing(true);

    try {
      const cached = cacheService.get(category, description, images, undefined, undefined, manualName);

      let result = cached;
      if (result) {
        setStatus("Loading your recent matching assessment...");
      } else {
        setStatus("Identifying the device and reviewing the symptoms...");
        result = await runForensicAudit(category, description, images, undefined, manualName);

        setStatus("Checking for matching repair guides...");
        result.repair_guides = await findRepairGuides(
          [result.brand, result.model].filter(Boolean).join(" ").trim(),
          description
        );

        cacheService.set(category, description, images, result, undefined, undefined, manualName);
      }

      const record: QueryRecord = {
        id: crypto.randomUUID ? crypto.randomUUID() : `scan_${Date.now()}`,
        created_at: new Date().toISOString(),
        category,
        description: description.trim(),
        device_name: manualName.trim() || undefined,
        photo_urls: images.slice(0, 1),
        ai_response: result,
      };

      saveHistory(record);
      onSuccess(record);
    } catch (error) {
      console.error("[DeviceLens] scan failed", error);
      let message = "The assessment failed. Please try again.";

      if (error instanceof Error) {
        const lower = error.message.toLowerCase();
        if (lower.includes("429") || lower.includes("capacity") || lower.includes("quota")) {
          message = "The Gemini quota is currently exhausted. Try again later.";
        } else if (lower.includes("timeout") || lower.includes("timed out")) {
          message = "The assessment timed out. Try again with fewer or smaller photos.";
        } else if (lower.includes("not configured") || lower.includes("api_key")) {
          message = "The Gemini API key is not configured on this deployment.";
        } else {
          message = error.message.slice(0, 180);
        }
      }

      setErrorMsg(message);
      setAnalyzing(false);
    }
  };

  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-10 text-center gap-6 page-enter">
        <div className="relative w-20 h-20">
          <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-accent/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary dark:text-accent text-4xl">frame_inspect</span>
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 dark:border-accent/20 border-t-primary dark:border-t-accent animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-dl-dt">Assessing your device</h2>
          <p className="text-sm text-gray-500 dark:text-dl-dt2 mt-2">{status}</p>
        </div>
        <p className="text-xs text-gray-400 dark:text-dl-dt2 max-w-xs">
          DeviceLens is looking for visible evidence and comparing it with the symptoms you provided.
        </p>
      </div>
    );
  }

  return (
    <div className="page-enter p-5 pb-40 space-y-6">
      <div className="flex items-start justify-between gap-4 pt-1">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] uppercase text-primary dark:text-accent">New scan</p>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-dl-dt tracking-tight mt-1">Show me the device.</h2>
          <p className="text-sm text-gray-400 dark:text-dl-dt2 mt-1">Clear photos plus good symptoms give better results.</p>
        </div>
        <button onClick={onCancel} className="text-sm text-gray-400 dark:text-dl-dt2 hover:text-gray-700 dark:hover:text-dl-dt font-medium">
          Cancel
        </button>
      </div>

      {errorMsg && <ToastNotification message={errorMsg} type="error" onDismiss={() => setErrorMsg(null)} />}

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-dl-dt">Photos</p>
            <p className="text-xs text-gray-400 dark:text-dl-dt2">1 required, up to 5.</p>
          </div>
          <span className="text-xs font-mono text-gray-400 dark:text-dl-dt2">{images.length}/5</span>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 items-start">
          {images.map((image, index) => (
            <div key={index} className="relative shrink-0 w-24 h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-dl-dark-b shadow-soft group">
              <img src={image} className="w-full h-full object-cover" alt={`Device photo ${index + 1}`} />
              <button
                type="button"
                onClick={() => setImages(current => current.filter((_, i) => i !== index))}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white opacity-80 hover:opacity-100"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ))}

          {images.length < 5 && (
            <>
              {isMobile && (
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="shrink-0 w-24 h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-dl-dark-b flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-dl-dt2 hover:border-primary dark:hover:border-accent hover:text-primary dark:hover:text-accent transition-colors"
                >
                  <span className="material-symbols-outlined text-3xl">photo_camera</span>
                  <span className="text-[10px] font-semibold">Camera</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="shrink-0 w-24 h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-dl-dark-b flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-dl-dt2 hover:border-primary dark:hover:border-accent hover:text-primary dark:hover:text-accent transition-colors"
              >
                <span className="material-symbols-outlined text-3xl">upload_file</span>
                <span className="text-[10px] font-semibold">Upload</span>
              </button>
            </>
          )}
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={event => {
            readFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={event => {
            readFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-dl-dt">Device type</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.values(DeviceCategory) as DeviceCategory[]).map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                category === item
                  ? "bg-primary/5 dark:bg-accent/10 border-primary dark:border-accent"
                  : "bg-white dark:bg-dl-dark-s border-gray-200 dark:border-dl-dark-b"
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${category === item ? "text-primary dark:text-accent" : "text-gray-400 dark:text-dl-dt2"}`}>
                {CATEGORY_ICONS[item]}
              </span>
              <span className={`text-xs font-medium ${category === item ? "text-primary dark:text-accent" : "text-gray-700 dark:text-dl-dt"}`}>
                {item}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <label htmlFor="device-name" className="text-sm font-semibold text-gray-800 dark:text-dl-dt">
          Known device name <span className="font-normal text-gray-400 dark:text-dl-dt2">(optional)</span>
        </label>
        <input
          id="device-name"
          value={manualName}
          onChange={event => setManualName(event.target.value)}
          maxLength={120}
          placeholder="e.g. Dell G15 5535, iPhone 15 Pro"
          className="w-full rounded-xl border border-gray-200 dark:border-dl-dark-b bg-white dark:bg-dl-dark-s text-gray-900 dark:text-dl-dt text-sm px-4 py-3 outline-none focus:border-primary dark:focus:border-accent"
        />
        <p className="text-[11px] text-gray-400 dark:text-dl-dt2">DeviceLens will still check whether the photos support the name you give it.</p>
      </section>

      <section className="space-y-2">
        <label htmlFor="symptoms" className="text-sm font-semibold text-gray-800 dark:text-dl-dt">
          What is happening? <span className="font-normal text-gray-400 dark:text-dl-dt2">(recommended)</span>
        </label>
        <textarea
          id="symptoms"
          value={description}
          onChange={event => setDescription(event.target.value)}
          maxLength={1200}
          rows={4}
          placeholder="Describe what happened, what you see or hear, when it started, and anything you already tried."
          className="w-full rounded-xl border border-gray-200 dark:border-dl-dark-b bg-white dark:bg-dl-dark-s text-gray-900 dark:text-dl-dt text-sm px-4 py-3 outline-none resize-none focus:border-primary dark:focus:border-accent"
        />
        <div className="flex justify-end">
          <span className="text-[10px] font-mono text-gray-400 dark:text-dl-dt2">{description.length}/1200</span>
        </div>
      </section>

      <section className="rounded-xl bg-amber-50 dark:bg-warning-d/10 border border-amber-200 dark:border-warning-d/20 p-3 flex gap-2">
        <span className="material-symbols-outlined text-warning dark:text-warning-d text-lg">health_and_safety</span>
        <p className="text-xs text-amber-800 dark:text-warning-d leading-relaxed">
          Do not open or keep using a device that is swollen, smoking, burning, wet, sparking, or connected to dangerous voltage.
        </p>
      </section>

      <button
        type="button"
        disabled={images.length === 0}
        onClick={handleAudit}
        className="w-full py-4 rounded-xl font-bold text-base text-white bg-primary hover:bg-primary-700 dark:bg-accent dark:text-dl-dark dark:hover:bg-blue-300 shadow-card dark:shadow-glow disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
      >
        Assess Device
      </button>
    </div>
  );
};

export default DiagnosticForm;
