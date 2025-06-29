export const logDebug = (context: string, data: unknown) => {
  if (import.meta.env.DEV) {
    console.group(`Debug: ${context}`);
    console.log(data);
    console.groupEnd();
  }
};