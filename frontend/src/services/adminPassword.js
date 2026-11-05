let handler = null;

export const registerAdminPasswordPrompt = (fn) => {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
};

export const askAdminPassword = (message) => (handler ? handler(message) : Promise.resolve(null));
