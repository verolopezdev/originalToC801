  // Validation function for category name
  export const validateName = (name: string): boolean => {
    const nameRegex = /^[\p{L}0-9\s@\-–—_/\.]+$/u;
    return nameRegex.test(name);
  };
