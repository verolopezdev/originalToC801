  // Validation function for category name and expense note
  export const validateName = (name: string): boolean => {
    // Normalize Unicode so visually identical characters are represented
    // consistently (important for international characters and accents).
    // NFC combines characters such as "e" + accent into "é" when possible.
    // trim() removes whitespace from the beginning and end of the name.
    const normalized = name.normalize("NFC").trim();
  
    // Reject empty or whitespace-only names.
    if (!normalized) {
      return false;
    }
  
    // Reject Unicode control characters (Cc) and format characters (Cf).
    //
    // We intentionally do NOT restrict the allowed letters, numbers,
    // punctuation, symbols, accents, or writing systems. This allows
    // category names in any language, including:
    //
    //   "Café & Restaurants"
    //   "São Paulo"
    //   "日本食"
    //   "Продукты"
    //   "الطعام"
    //   "한국 음식"
    //
    // The "u" flag enables Unicode property escapes such as \p{Cc}.
    //
    // The ! means we return true when NO control/format character is found.
    return !/[\p{Cc}\p{Cf}]/u.test(normalized);
  };




  // Validate email
export const validateEmail = (email: string): boolean => {
  // Normalize Unicode so equivalent representations of international
  // characters are treated consistently.
  const normalized = email.normalize("NFC").trim();

  // Basic email structure:
  //   something@domain.extension
  //
  // [^\s@]+  = one or more characters that aren't whitespace or "@"
  // @        = required @ symbol
  // [^\s@]+  = domain
  // \.       = required dot
  // [^\s@]+  = domain extension / final part
  //
  // This intentionally does NOT try to implement the complete email
  // specification. The email provider/server should perform final validation.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(normalized);
};  
