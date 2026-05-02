export type AppErrorCode =
  | 'PROTOCOL_MISMATCH'
  | 'HIGH_VOLTAGE_RISK'
  | 'CONFIDENCE_TOO_LOW'
  | 'IMAGE_BLURRY'
  | 'IMAGE_TOO_DARK'
  | 'NO_DEVICE_FOUND'
  | 'NETWORK_TIMEOUT'
  | 'API_QUOTA_EXCEEDED'
  | 'LOCATION_DENIED'
  | 'SEARCH_EMPTY'
  | 'UNKNOWN_ERROR';

export class AppError extends Error {
  public code: AppErrorCode;
  public userMessage: string;
  public originalError?: unknown;

  constructor(code: AppErrorCode, message: string, userMessage: string, originalError?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    this.originalError = originalError;
  }
}

export const logError = (error: unknown, context: string) => {
  const timestamp = new Date().toISOString();
  if (error instanceof AppError) {
    console.warn(`[DL_WARN][${timestamp}][${context}] ${error.code}: ${error.message}`);
  } else {
    console.error(`[DL_ERROR][${timestamp}][${context}] Unexpected:`, error);
  }
};

export const createError = (code: AppErrorCode, originalError?: unknown): AppError => {
  switch (code) {
    case 'HIGH_VOLTAGE_RISK':
      return new AppError(code, 'High voltage device detected', 'Safety warning: This device involves high voltage. DIY repair is not recommended.', originalError);
    case 'CONFIDENCE_TOO_LOW':
      return new AppError(code, 'AI confidence below threshold', 'We couldn\'t clearly identify this device. Try retaking the photo with better lighting.', originalError);
    case 'IMAGE_BLURRY':
      return new AppError(code, 'Image sharpness check failed', 'The photo is too blurry. Hold steady and try again.', originalError);
    case 'NETWORK_TIMEOUT':
      return new AppError(code, 'Request timed out', 'Connection timed out. Please check your internet connection and try again.', originalError);
    case 'API_QUOTA_EXCEEDED':
      return new AppError(code, 'API quota exceeded', 'DeviceLens is at capacity right now. Please try again in a minute.', originalError);
    case 'NO_DEVICE_FOUND':
      return new AppError(code, 'No device identified in frame', 'No device detected in the photo. Make sure the device is centered and well-lit.', originalError);
    default:
      return new AppError('UNKNOWN_ERROR', 'An unexpected error occurred', 'Something went wrong. Please try again.', originalError);
  }
};

/* Backwards-compat alias so existing test files still compile */
export { AppError as TitanError };
export type { AppErrorCode as TitanErrorCode };
