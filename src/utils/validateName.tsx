  // Validation function for category name
  export const validateName = (name: string): boolean => {
    // Added "," right after the "\." at the end of the character class
    const nameRegex = /^[\p{L}0-9\s@\-–—_/\.,]+$/u;
    return nameRegex.test(name);
  };
