export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`ℹ️ [INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`⚠️ [WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`❌ [ERROR] ${message}`, ...args);
  },
  success: (message: string, ...args: any[]) => {
    console.log(`✅ [SUCCESS] ${message}`, ...args);
  }
};
