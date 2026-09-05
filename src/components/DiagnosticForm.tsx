import React, { useEffect, useRef, useState } from "react";
import {
  DeviceCategory,
  DiagnosticAnswer,
  IdentificationResult,
  QueryRecord,
} from "../types";
import {
  cleanupInteraction,
  identifyDevice,
  runGuidedDiagnosis,
} from "../services/geminiService";
import { findRepairGuides } from "../services/repairGuideService";
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

  const [isMobile] = useState(isTouchDevice);
  const [stage, setStage] = useState<"intake" | "identifying" | "questions" | "diagnosing">("intake");
  const [images, setImages] = useState<string[]>([]);
  const [category, setCategory] = useState<DeviceCategory>(DeviceCategory.PHONE);
  const [description, setDescription] = useState("");
  const [manualName, setManualName] = useState("");
  const [identification, setIdentification] = useState<IdentificationResult | null>(null);
  const [confirmedDeviceName, setConfirmedDeviceName] = useState("");
  const [userVerifiedIdentity, setUserVerifiedIdentity] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [extraNotes, setExtraNotes] = useState("");
  const [status, setStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const activeInteractionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    return () => {
      cleanupInteraction(activeInteractionRef.current);
    };
  }, []);

  const readFiles = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).slice(0, Math.max(0, 5 - images.length));

    selected.forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result !== "string") return;
        const compressed = await compressImage(reader.result);
        setImages(current => current.length >= 5 ? current : [...current, compressed]);
      };
      reader.readAsDataURL(file);
    });
  };

  const startIdentification = async () => {
    if (!images.length) return;
    setErrorMsg(null);
    setStage("identifying");
    setStatus("Identifying the device and choosing the most useful diagnostic checks...");

    try {
      const result = await identifyDevice(category, description, images, manualName);
      activeInteractionRef.current = result.interaction_id;
      setIdentification(result);
      setConfirmedDeviceName(
        manualName.trim() ||
        [result.brand, result.model].filter(Boolean).join(" ").trim()
      );
      setAnswers({});
      setStage("questions");
    } catch (error) {
      setStage("intake");
      setErrorMsg(error instanceof Error ? error.message : "Identification failed. Please try again.");
    }
  };

  const finishDiagnosis = async () => {
    if (!identification) return;

    const diagnosticAnswers: DiagnosticAnswer[] = identification.diagnostic_questions.map(question => ({
      question: question.question,
      answer: answers[question.id] || "Not answered",
    }));

    setErrorMsg(null);
    setStage("diagnosing");
    setStatus("Combining the photos, identification evidence, symptoms, and your answers...");

    try {
      const result = await runGuidedDiagnosis({
        interactionId: identification.interaction_id,
        category,
        description,
        confirmedDeviceName,
        userVerifiedIdentity,
        identification,
        answers: diagnosticAnswers,
        extraNotes,
      });

      setStatus("Checking for matching repair guides...");
      result.repair_guides = await findRepairGuides(
        [result.brand, result.model].filter(Boolean).join(" ").trim(),
        description || result.likely_causes[0]?.cause || ""
      );

      const record: QueryRecord = {
        id: crypto.randomUUID ? crypto.randomUUID() : `scan_${Date.now()}`,
        created_at: new Date().toISOString(),
        category,
        description: description.trim(),
        device_name: confirmedDeviceName.trim() || undefined,
        photo_urls: images.slice(0, 1),
        ai_response: result,
      };

      saveHistory(record);
      await cleanupInteraction(identification.interaction_id);
      activeInteractionRef.current = undefined;
      onSuccess(record);
    } catch (error) {
      setStage("questions");
      setErrorMsg(error instanceof Error ? error.message : "Final assessment failed. Please try again.");
    }
  };

  const cancel = async () => {
    await cleanupInteraction(activeInteractionRef.current);
    activeInteractionRef.current = undefined;
    onCancel();
  };

  if (stage === "identifying" || stage === "diagnosing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-10 text-center gap-6 page-enter">
        <div className="relative w-20 h-20">
          <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-accent/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary dark:text-accent text-4xl">
              {stage === "identifying" ? "frame_inspect" : "troubleshoot"}
            </span>
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 dark:border-accent/20 border-t-primary dark:border-t-accent animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-dl-dt">
            {stage === "identifying" ? "Identifying your device" : "Building the final assessment"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-dl-dt2 mt-2">{status}</p>
        </div>
      </div>
    );
  }

  if (stage === "questions" && identification) {
    return (
      <div className="page-enter p-5 pb-40 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] uppercase text-primary dark:text-accent">Stage 2 of 2</p>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-dl-dt mt-1">Help narrow it down.</h2>
            <p className="text-sm text-gray-400 dark:text-dl-dt2 mt-1">These questions are chosen from what DeviceLens saw and what you reported.</p>
          </div>
          <button onClick={cancel} className="text-sm text-gray-400 dark:text-dl-dt2">Cancel</button>
        </div>

        {errorMsg && <ToastNotification message={errorMsg} type="error" onDismiss={() => setErrorMsg(null)} />}

        {identification.safety_stop && (
          <section className="rounded-2xl border border-red-300 dark:border-danger-d/30 bg-red-50 dark:bg-danger-d/10 p-4">
            <p className="font-bold text-danger dark:text-danger-d">Safety warning</p>
            <p className="text-sm text-red-700 dark:text-danger-d/90 mt-1">{identification.safety_message || "Do not continue with hands-on testing. Disconnect the device if it is safe to do so and seek professional help."}</p>
          </section>
        )}

        <section className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b p-5 space-y-4">
          <div>
            <p className="text-xs text-gray-400 dark:text-dl-dt2">{identification.identified_category}</p>
            <h3 className="text-xl font-extrabold mt-1">{identification.brand} <span className="text-primary dark:text-accent">{identification.model}</span></h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-bold text-primary dark:text-accent">{identification.confidence_label}</span>
              <span className="text-xs text-gray-400 dark:text-dl-dt2">• {identification.confidence_score}% exact-model confidence</span>
            </div>
          </div>

          {identification.identification_evidence.length > 0 && (
            <ul className="space-y-1.5">
              {identification.identification_evidence.map((item, index) => (
                <li key={index} className="flex gap-2 text-xs text-gray-500 dark:text-dl-dt2">
                  <span className="material-symbols-outlined text-primary dark:text-accent text-sm">visibility</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}

          {identification.needs_verification && (
            <div className="rounded-xl bg-amber-50 dark:bg-warning-d/10 border border-amber-200 dark:border-warning-d/20 p-3">
              <p className="text-xs font-bold text-warning dark:text-warning-d">Exact model not fully verified</p>
              <p className="text-xs text-amber-800 dark:text-warning-d/90 mt-1">{identification.verification_request}</p>
            </div>
          )}

          <label className="block">
            <span className="text-xs font-semibold text-gray-700 dark:text-dl-dt">Confirmed device/model</span>
            <input
              value={confirmedDeviceName}
              onChange={event => {
                setConfirmedDeviceName(event.target.value);
                setUserVerifiedIdentity(false);
              }}
              placeholder="Enter model from a label, About screen, BIOS, etc."
              className="mt-2 w-full rounded-xl border border-gray-200 dark:border-dl-dark-b bg-white dark:bg-dl-dark-s2 px-4 py-3 text-sm outline-none focus:border-primary dark:focus:border-accent"
            />
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={userVerifiedIdentity}
              onChange={event => setUserVerifiedIdentity(event.target.checked)}
              className="mt-1"
            />
            <span className="text-xs text-gray-600 dark:text-dl-dt2 leading-relaxed">
              I verified this exact model from a reliable identifier such as a model plate, Settings/About screen, BIOS/System Information, or service tag.
            </span>
          </label>
        </section>

        {!identification.safety_stop && identification.diagnostic_questions.map((question, index) => (
          <section key={question.id} className="bg-white dark:bg-dl-dark-s rounded-2xl border border-gray-100 dark:border-dl-dark-b p-4 space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-accent">Check {index + 1}</p>
              <h3 className="font-bold text-sm mt-1">{question.question}</h3>
              <p className="text-xs text-gray-400 dark:text-dl-dt2 mt-1">{question.why_it_matters}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {question.options.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAnswers(current => ({ ...current, [question.id]: option }))}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    answers[question.id] === option
                      ? "border-primary dark:border-accent bg-primary/10 dark:bg-accent/10 text-primary dark:text-accent"
                      : "border-gray-200 dark:border-dl-dark-b text-gray-600 dark:text-dl-dt2"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>
        ))}

        <section className="space-y-2">
          <label htmlFor="extra-notes" className="text-sm font-semibold text-gray-800 dark:text-dl-dt">Anything else you observed? <span className="font-normal text-gray-400">(optional)</span></label>
          <textarea
            id="extra-notes"
            value={extraNotes}
            onChange={event => setExtraNotes(event.target.value)}
            rows={3}
            maxLength={1200}
            placeholder="Error code, unusual noise, heat, recent drop, liquid exposure, test result, etc."
            className="w-full rounded-xl border border-gray-200 dark:border-dl-dark-b bg-white dark:bg-dl-dark-s px-4 py-3 text-sm outline-none resize-none focus:border-primary dark:focus:border-accent"
          />
        </section>

        <button
          type="button"
          onClick={finishDiagnosis}
          className="w-full py-4 rounded-xl font-bold text-base text-white bg-primary hover:bg-primary-700 dark:bg-accent dark:text-dl-dark shadow-card dark:shadow-glow active:scale-[0.98] transition-all"
        >
          Build Final Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="page-enter p-5 pb-40 space-y-6">
      <div className="flex items-start justify-between gap-4 pt-1">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] uppercase text-primary dark:text-accent">Stage 1 of 2</p>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-dl-dt tracking-tight mt-1">Show me the device.</h2>
          <p className="text-sm text-gray-400 dark:text-dl-dt2 mt-1">Clear photos and symptoms help DeviceLens identify what it can actually support.</p>
        </div>
        <button onClick={cancel} className="text-sm text-gray-400 dark:text-dl-dt2">Cancel</button>
      </div>

      {errorMsg && <ToastNotification message={errorMsg} type="error" onDismiss={() => setErrorMsg(null)} />}

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-dl-dt">Photos</p>
            <p className="text-xs text-gray-400 dark:text-dl-dt2">1 required, up to 5. Include labels/model plates when available.</p>
          </div>
          <span className="text-xs font-mono text-gray-400 dark:text-dl-dt2">{images.length}/5</span>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 items-start">
          {images.map((image, index) => (
            <div key={index} className="relative shrink-0 w-24 h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-dl-dark-b">
              <img src={image} className="w-full h-full object-cover" alt={`Device photo ${index + 1}`} />
              <button onClick={() => setImages(current => current.filter((_, i) => i !== index))} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ))}

          {images.length < 5 && (
            <>
              {isMobile && (
                <button type="button" onClick={() => cameraInputRef.current?.click()} className="shrink-0 w-24 h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-dl-dark-b flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-dl-dt2">
                  <span className="material-symbols-outlined text-3xl">photo_camera</span>
                  <span className="text-[10px] font-semibold">Camera</span>
                </button>
              )}
              <button type="button" onClick={() => galleryInputRef.current?.click()} className="shrink-0 w-24 h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-dl-dark-b flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-dl-dt2">
                <span className="material-symbols-outlined text-3xl">upload_file</span>
                <span className="text-[10px] font-semibold">Upload</span>
              </button>
            </>
          )}
        </div>

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={event => { readFiles(event.target.files); event.target.value = ""; }} />
        <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={event => { readFiles(event.target.files); event.target.value = ""; }} />
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-dl-dt">Device type</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.values(DeviceCategory) as DeviceCategory[]).map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left ${
                category === item
                  ? "bg-primary/5 dark:bg-accent/10 border-primary dark:border-accent"
                  : "bg-white dark:bg-dl-dark-s border-gray-200 dark:border-dl-dark-b"
              }`}
            >
              <span className="material-symbols-outlined text-xl">{CATEGORY_ICONS[item]}</span>
              <span className="text-xs font-medium">{item}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <label htmlFor="device-name" className="text-sm font-semibold text-gray-800 dark:text-dl-dt">Possible device name <span className="font-normal text-gray-400">(optional)</span></label>
        <input
          id="device-name"
          value={manualName}
          onChange={event => setManualName(event.target.value)}
          maxLength={120}
          placeholder="e.g. Dell G15 5535, iPhone 15 Pro"
          className="w-full rounded-xl border border-gray-200 dark:border-dl-dark-b bg-white dark:bg-dl-dark-s px-4 py-3 text-sm outline-none focus:border-primary dark:focus:border-accent"
        />
      </section>

      <section className="space-y-2">
        <label htmlFor="symptoms" className="text-sm font-semibold text-gray-800 dark:text-dl-dt">What is happening? <span className="font-normal text-gray-400">(recommended)</span></label>
        <textarea
          id="symptoms"
          value={description}
          onChange={event => setDescription(event.target.value)}
          maxLength={1200}
          rows={4}
          placeholder="What happened, what you see or hear, when it started, and anything you already tried."
          className="w-full rounded-xl border border-gray-200 dark:border-dl-dark-b bg-white dark:bg-dl-dark-s px-4 py-3 text-sm outline-none resize-none focus:border-primary dark:focus:border-accent"
        />
      </section>

      <section className="rounded-xl bg-amber-50 dark:bg-warning-d/10 border border-amber-200 dark:border-warning-d/20 p-3 flex gap-2">
        <span className="material-symbols-outlined text-warning dark:text-warning-d text-lg">health_and_safety</span>
        <p className="text-xs text-amber-800 dark:text-warning-d leading-relaxed">
          Do not open or keep using hardware that is swollen, smoking, burning, wet, sparking, or connected to dangerous voltage.
        </p>
      </section>

      <button
        type="button"
        disabled={images.length === 0}
        onClick={startIdentification}
        className="w-full py-4 rounded-xl font-bold text-base text-white bg-primary hover:bg-primary-700 dark:bg-accent dark:text-dl-dark shadow-card dark:shadow-glow disabled:opacity-30 active:scale-[0.98] transition-all"
      >
        Identify and Continue
      </button>
    </div>
  );
};

export default DiagnosticForm;
