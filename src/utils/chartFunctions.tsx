import { db, Expense, Category, Subcategory, Account } from "../db"; // your Dexie instance
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Decimal } from 'decimal.js';
import i18n from '../i18n';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';



export async function getExpensesInRange(
  startDate: string,
  endDate: string,
  categoryId?: string,
): Promise<Expense[]> {
  return db.expenses
    .where("expenseDate")
    .between(startDate, endDate, true, true)
    .and(e => e.isActive === 1 && (!categoryId || e.categoryId === categoryId))
    .toArray();
}




export const getExpensesWithCategories = async (startDate: Date, endDate: Date) => {
  // Query only active expenses within range (this field IS indexed normally)
  const expenses = await db.expenses
    .where('expenseDate')
    .between(startDate.toISOString(), endDate.toISOString(), true, true)
    .and(exp => exp.isActive === 1)
    .toArray();

  // Get all categories and filter active in memory
  const categories = await db.categories.toArray();

  // Build lookup map
  const categoryMap = new Map(categories.map(cat => [cat.categoryId, cat]));

  return expenses.map(exp => ({
    ...exp,
    category: categoryMap.get(exp.categoryId) || null
  }));
};



/**
 * Resolve a category color from a CSS variable name.
 * Example: if colorName = "primary", it will look for --primary in :root.
 */
export function resolveCategoryColor(colorName: string): string {
  if (!colorName) return "#008B8B"; // fallback
  const cssVarName = `--${colorName}`;
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVarName);
  return value ? value.trim() : "#008B8B";
}



/**
 * Format a number as currency using locale and currency code.
 */
export function formatPrice(value: number, currencyCode: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}



/**
 * Format a number into a compact string with K, M, B suffix.
 * Examples:
 *   1.200	-> 1.2k
 *   2.500	-> 2.5k
 *   200.000 ->	200k
 *   3.500.000 ->	3.5M
 *   2.000.000 ->	2M
 * @param value number
 * @param decimals number of decimals, default 1
 */
export const formatNumberCompact = (value: number): string => {
  const abs = Math.abs(value);

  const format = (num: number, suffix: string) => {
    // Only show decimal if it’s not a whole number
    const rounded = num % 1 === 0 ? num.toString() : num.toFixed(1);
    return rounded + suffix;
  };

  if (abs >= 1_000_000_000) return format(value / 1_000_000_000, "B");
  if (abs >= 1_000_000) return format(value / 1_000_000, "M");
  if (abs >= 1_000) return format(value / 1_000, "k");
  return value.toString();
};


// Export expenses to CSV file
export interface ExportCurrency {
  code: string;
  symbol: string;
  locale: string;
  decimalSeparator: string;
  thousandSeparator: string;
  name: string;
}

export async function exportExpensesToCSV(
  expenses: Expense[],
  categories: Category[],
  accounts: Account[],
  defaultCurrency: ExportCurrency,
) {
  if (!expenses?.length) {
    console.warn("No expenses to export.");
    alert(i18n.t('utils.none_to_export'));
    return;
  }

  const {
    locale,
    symbol,
    decimalSeparator,
    thousandSeparator,
    code,
    name,
  } = defaultCurrency || {
    locale: "en-US",
    symbol: "$",
    decimalSeparator: ".",
    thousandSeparator: ",",
    code: "CUR",
    name: i18n.t('utils.currency_name'),
  };

  // Choose separator (avoid comma if decimal separator is comma)
  const separator = decimalSeparator === "," ? ";" : ",";

  // Lookup maps
  const categoryMap = categories.reduce<Record<string, string>>((acc, cat) => {
    acc[cat.categoryId] = cat.categoryName;
    return acc;
  }, {});

  const accountMap = accounts.reduce<Record<string, string>>((acc, accItem) => {
    acc[accItem.accountId] = accItem.accountName;
    return acc;
  }, {});

  // Sort by date ascending
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime()
  );

  // --- Formatters ---
  const formatAmount = (
    amountCents: number,
    decSep = decimalSeparator,
    thouSep = thousandSeparator,
    sym = symbol
  ): string => {
    const amount = amountCents / 100;
    let [intPart, decPart] = amount.toFixed(2).split(".");
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thouSep);
    return `${sym}${intPart}${decSep}${decPart}`;
  };

  // ✅ Corrected formatDate to output YYYY-MM-DD
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = String(date.getFullYear()); // Get ALL 4 digits

      // Output in YYYY-MM-DD format
      return `${year}-${month}-${day}`;
    } catch {
      return dateStr;
    }
  };
  
  // --- User-friendly column names ---
  const headers = [
    i18n.t('utils.header_date'),
    i18n.t('utils.header_account'),
    i18n.t('utils.header_cat'),
    i18n.t('utils.header_note'),
    name,
    i18n.t('utils.header_amount'), // This will now show all original amounts + code for alternatives
  ];

  const rows = sortedExpenses.map((exp) => {
    const formattedDate = formatDate(exp.expenseDate);
    const formattedAmount = formatAmount(exp.expenseAmountDefault); // Amount in default currency

    // --- Original Amount Logic ---
    let originalAmountString = "";

    // Build note with installment label
    let note = exp.expenseNote || "";
    if (exp.installmentIndex !== undefined && exp.installmentIndex > 0 && exp.totalInstallments !== undefined && exp.totalInstallments > 0) {
      note += ` (${exp.installmentIndex}/${exp.totalInstallments})`;
    }
    
    
    // The amount in cents to be formatted (alt/trip, or default if no alternative)
    const amountCents = exp.expenseAmountAlt || exp.expenseAmountTrip || exp.expenseAmountDefault;
    const currencyCode = exp.expenseCurrencyCode || code;

    if (amountCents) {
      // Set fallback locale and separators for the original currency's formatting
      const altLocale = exp.expenseLocale || "en-US";
      const altDecSep = altLocale.startsWith("es") ? "," : ".";
      const altThouSep = altLocale.startsWith("es") ? "." : ",";

      if (currencyCode === code) {
        // Case 1: Default Currency - format with its symbol
        // The formatAmount function handles symbol placement
        originalAmountString = formatAmount(amountCents, altDecSep, altThouSep, symbol);
      } else {
        // Case 2: Alternative Currency - format number only, then append code
        const amount = amountCents / 100;
        let [intPart, decPart] = amount.toFixed(2).split(".");
        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, altThouSep);
        
        // Combine number, decimal part, and currency code (e.g., "100.00 EUR")
        originalAmountString = `${intPart}${altDecSep}${decPart} ${currencyCode}`;
      }
    }
    // --- End Original Amount Logic ---

    // Removed numericAmount, originalAmount is now originalAmountString
    return [
      formattedDate,
      accountMap[exp.accountId] || i18n.t('utils.account', { id: exp.accountId }),
      categoryMap[exp.categoryId] || i18n.t('utils.category', { id: exp.categoryId }),
      note,
      formattedAmount,
      originalAmountString, // Use the new, formatted original amount + code
    ];
  });


  // --- Escape problematic cells ---
  const escapeCell = (cell: string | number) => {
    const str = String(cell);
    return str.includes(separator) || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const csvContent =
    [headers, ...rows].map((row) => row.map(escapeCell).join(separator)).join("\n");

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  
  const fileName = `expenses_${dateStr}.csv`; // Example: expenses_2025-10-09_14-23-45.csv

  // --- Save to file ---
  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.writeFile({  
        path: fileName,
        data: csvContent,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      return fileName; // ✅ Return the path  

    } catch (err) {
      console.error("Failed to save CSV:", err);
    }
  } else {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return fileName;
  }
}


// Define a type for the result returned by jspdf-autotable, which includes finalY
type AutoTableResult = {
  finalY: number;
  // Add other properties if needed, but finalY is the critical one
};

export const exportExpensesToPDF = async (
  expenses: (Expense & { category: Category | null })[],
  categories: Category[],
  accounts: Account[],
  defaultCurrency: ExportCurrency,
  timeFrame: string,
  chartImageBase64?: string,
  reportStartDate?: Date,
  reportEndDate?: Date,
  chartRenderWidthPDF: number = 500,
  logoBase64?: string,
  groupedData?: { categoryTables: any[]; grandTotal: number }, // Show expenses by category in separated tables
): Promise<string | undefined> => {
  
  /*
    1. Validation: No expenses → stop
  */
  if (!expenses?.length) {
    console.warn("No expenses to export.");
    alert(i18n.t('utils.none_to_export'));
    return;
  }


  /*
    2. Destructure currency info (with fallback)
  */
  const {
    symbol,
    decimalSeparator,
    thousandSeparator,
    code,
    name
  } = defaultCurrency || {
    symbol: "$",
    decimalSeparator: ".",
    thousandSeparator: ",",
    code: "CUR",
    name: i18n.t('utils.currency_name')
  };


  /*
    3. Build lookup maps for categories & accounts
  */
  const categoryMap = categories.reduce<Record<string, string>>((acc, cat) => {
    acc[cat.categoryId] = cat.categoryName;
    return acc;
  }, {});
  
  const accountMap = accounts.reduce<Record<string, string>>((acc, accItem) => {
    acc[accItem.accountId] = accItem.accountName;
    return acc;
  }, {});

  
  /*
    4. Sort expenses by date ascending
    Only sort the main list if we are using the single table view.
    If using groupedData, we will use the expenses list inside each category object.
  */
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime()
  );


  /*
    5. Utility: Format amounts for readable output (Cents to Currency String)
  */
  const formatAmount = (
    amountCents: number,
    decSep = decimalSeparator,
    thouSep = thousandSeparator,
    sym = symbol
  ): string => {
    const amount = amountCents / 100;
    let [intPart, decPart] = amount.toFixed(2).split(".");
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thouSep);
    return `${sym}${intPart}${decSep}${decPart}`;
  };


  /*
    6. Utility: Format date to YYYY-MM-DD
  */
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = String(date.getFullYear());
      return `${year}-${month}-${day}`;
    } catch {
      return dateStr;
    }
  };
  

  /*
    7. Helper function to format a single expense row for a table
  */
  const mapExpenseToTableRow = (exp: Expense & { category: Category | null }) => {
    const formattedDate = formatDate(exp.expenseDate);
    const finalAmount = formatAmount(exp.expenseAmountDefault);
    let originalAmount = "";

    // Build note with installment label
    let note = exp.expenseNote || "";
    if (exp.installmentIndex !== undefined && exp.installmentIndex > 0 && exp.totalInstallments !== undefined && exp.totalInstallments > 0) {
      note += ` (${exp.installmentIndex}/${exp.totalInstallments})`;
    }

    // Original Amount Logic (simplified for brevity)
    if (exp.expenseCurrencyCode && exp.expenseCurrencyCode !== code) {
      const amountCents = exp.expenseAmountAlt || exp.expenseAmountTrip;
      if (amountCents) {
          const altLocale = exp.expenseLocale || "en-US";
          const altSymbol = exp.expenseCurrencyCode === "USD" ? "$" : exp.expenseCurrencyCode;
          const altDecSep = altLocale.startsWith("es") ? "," : ".";
          const altThouSep = altLocale.startsWith("es") ? "." : ",";
          originalAmount = formatAmount(amountCents, altDecSep, altThouSep, altSymbol) + ` ${exp.expenseCurrencyCode}`;
      }
    } else {
      originalAmount = formatAmount(exp.expenseAmountDefault);
    }

    return [
      formattedDate,
      accountMap[exp.accountId] || i18n.t('utils.account', { id: exp.accountId }),
      categoryMap[exp.categoryId] || i18n.t('utils.category', { id: exp.categoryId }),
      note,
      originalAmount,
      finalAmount,
    ];
  };


  /*
    8. Define table headers
  */
    const headers = [
      i18n.t('utils.header_date'),
      i18n.t('utils.header_account'),
      i18n.t('utils.header_cat'),
      i18n.t('utils.header_note'),
      i18n.t('utils.header_amount'), // This will now show all original amounts + code for alternatives
      name,
    ];
  

  /* 
    9. Build and style the PDF (Header, Logo, Title, etc.)
  */
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'A4',
  });

  const pageMargin = 40;
  const fullPageWidth = doc.internal.pageSize.getWidth();

  // Logo position logic
  const LOGO_SIZE = 40;
  const LOGO_MARGIN_TOP = 40;
  const MARGIN_BOTTOM_LOGO = 20;

  if (logoBase64) {
    const logoX = fullPageWidth - pageMargin - LOGO_SIZE;
    doc.addImage(logoBase64, 'PNG', logoX, LOGO_MARGIN_TOP, LOGO_SIZE, LOGO_SIZE);
  }
  
  const reportTitleY = LOGO_MARGIN_TOP + LOGO_SIZE + MARGIN_BOTTOM_LOGO;
  
  // Add header text
  doc.setFontSize(18);
  doc.text(i18n.t('utils.expenses_report'), fullPageWidth - pageMargin, reportTitleY, { align: 'right' });
  doc.setFontSize(10);
  doc.text(i18n.t('utils.generated', { date: new Date().toLocaleString() }), fullPageWidth - pageMargin, reportTitleY + 20, { align: 'right' });

  const formatDisplayDate = (date?: Date) =>
    date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
  const reportStart = formatDisplayDate(reportStartDate);
  const reportEnd = formatDisplayDate(reportEndDate);

  doc.text(
    i18n.t('utils.reporting_period', {
      start: reportStart,
      end: reportEnd
    }),
    fullPageWidth - pageMargin,
    reportTitleY + 35,
    { align: 'right' }
  );

  // Dotted line separator
  let lineY = reportTitleY + 45;
  doc.setLineWidth(0.1);
  for (let x = pageMargin; x < fullPageWidth - pageMargin; x += 4) {
    doc.line(x, lineY, x + 2, lineY);
  }

  // Update currentY after the new lines
  let currentY = lineY + 25;
  let chartTitle = '';
  let chartDescription = '';

  if(timeFrame === 'month') {
    chartTitle = i18n.t('utils.pdf_monthly_by_cat');
    chartDescription = i18n.t('utils.pdf_monthly_by_cat_msg');
  } else {
    chartTitle = i18n.t('utils.pdf_annual_by_month');
    chartDescription = i18n.t('utils.pdf_annual_by_month_msg');
  }

  // --- Section Title and Description ---
  doc.setFontSize(14);
  doc.setFont('helvetica');
  doc.text(chartTitle, pageMargin, currentY);
  currentY += 20;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const splitDescription = doc.splitTextToSize(chartDescription, fullPageWidth - pageMargin * 2);
  doc.text(splitDescription, pageMargin, currentY);
  currentY += splitDescription.length * 12 + 10;

  // --- Chart Insertion Logic (kept the same) ---
  const CHART_RENDER_WIDTH = chartRenderWidthPDF;
  const chartStartX = (fullPageWidth - CHART_RENDER_WIDTH) / 2;

  if (chartImageBase64) {
    // Chart Image Dimension and Insertion logic
    const imgData = chartImageBase64;
    const startYForChart = currentY; 
    let imgHeight = 0; 
    
    // Asynchronously load the Base64 image to read its dimensions
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const originalWidth = img.naturalWidth;
        const originalHeight = img.naturalHeight;
        imgHeight = (originalHeight / originalWidth) * CHART_RENDER_WIDTH;
        const maxHeight = fullPageWidth * 0.9;
        if (imgHeight > maxHeight) imgHeight = maxHeight;
        resolve();
      };

      img.onerror = () => {
        console.error("Image loading failed in PDF utility for dimension reading.");
        resolve(); 
      }
      img.src = imgData;
    });
    
    if (imgHeight > 0) {
      doc.addImage(imgData, 'PNG', chartStartX, startYForChart, CHART_RENDER_WIDTH, imgHeight);
      currentY = startYForChart + imgHeight + 20; 
    }
  }

  // Add table header title and text
  const MARGIN_TOP_TRANSACTIONS_TITLE = 15; // Define the extra vertical space for title (e.g., 15pt)
  currentY += MARGIN_TOP_TRANSACTIONS_TITLE;


  // --- CONDITIONAL TABLE RENDERING LOGIC ---
  if (groupedData) {
    // ----------------------------------------------------
    // CASE 1: Render Multiple Tables (Grouped by Category)
    // ----------------------------------------------------

    // 1. Add Section Title
    doc.setFontSize(14);
    doc.setFont('helvetica');
    doc.text(i18n.t('utils.detailed_by_cat'), pageMargin, currentY);
    currentY += 25;

    // 2. Loop through each category table
    for (const table of groupedData.categoryTables) {
      
      // Get the rows for the current category, sorted by date
      const categoryRows = table.expenses
        .sort((a: any, b: any) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime())
        .map(mapExpenseToTableRow);
      
      // Remove the Category column from headers since it's the title of the table
      const categoryHeaders = headers.filter(h => h !== i18n.t('utils.header_cat'));
      
      // The body rows now need the category column removed as well (index 2)
      const categoryRowsCleaned = categoryRows.map((row: any[]) => 
          row.filter((_, index) => index !== 2)
      );

      // Check if there are rows before drawing the table
      if (categoryRowsCleaned.length === 0) {
        console.warn(`Skipping empty category table: ${table.categoryName}`);
        continue; // Skip to the next iteration if the table is empty
      }

      // 1. Calculate space needed for the Category Header: 
      //    Header height (~15pt) + margin (10pt) = 25pt. 
      //    Add space for at least 3 rows (3 * ~10pt cell height) = 30pt.
      const SPACE_NEEDED_FOR_CATEGORY = 55; // (25pt header + 30pt minimum table body)
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageMarginBottom = 40; // Assuming your bottom margin is 40pt

      // Check if the current Y position is too close to the bottom margin.
      if (currentY + SPACE_NEEDED_FOR_CATEGORY > pageHeight - pageMarginBottom) {
        // If true, start a new page.
        doc.addPage();
        
        // Reset Y position to top margin (e.g., 40pt)
        currentY = 40; 
      }
      

      // Add Category Header
      doc.setFontSize(12);
      doc.setFont('helvetica');
      doc.text(i18n.t('utils.category_name', {name: table.categoryName}), pageMargin, currentY);
      currentY += 10; // Move Y down after the heading


      // 1. Call autoTable. We are only interested in its side effect on the document.
      autoTable(doc, {
        startY: currentY, // Start from the current known Y position
        head: [categoryHeaders],
        body: categoryRowsCleaned,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [0, 102, 204], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: pageMargin, right: pageMargin },
        columnStyles: {
          3: { halign: 'right' }, // Original Amount (new index 3)
          4: { halign: 'right' }  // Final Amount (new index 4)
        },
        foot: [
          [
            { 
              content: i18n.t('utils.subtotal', {amount: formatAmount(table.subtotal)}), 
              colSpan: categoryHeaders.length, 
              styles: { 
                halign: 'right', 
                fillColor: [200, 217, 234], // Light blue
                textColor: [0, 102, 204] // Blue, matches header
            } 
            }
          ]
        ],
      });

      // 2. Update Y position using the reliable property on the doc object.
        // The property 'lastAutoTable' is guaranteed to be set if the table was drawn.
        const lastTable = (doc as any).lastAutoTable;

        if (lastTable && lastTable.finalY !== undefined) {
          currentY = lastTable.finalY + 30;
        } else {
          // This fallback is only needed if lastAutoTable is also missing, 
          // which would indicate a deep jspdf-autotable failure.
          console.error("Critical: Could not determine finalY using lastAutoTable.");
          currentY += 150; 
        }
    }

    // 3. Add Grand Total
    // 1. Calculate space needed for Grand Total: 
    //    Text line (~16pt) + margin (20pt) = 36pt. 
    const SPACE_NEEDED_FOR_GRAND_TOTAL = 40; 
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageMarginBottom = 40; // The bottom margin area where the page number sits

    // 2. Check if the current Y position is too close to the bottom margin.
    if (currentY + SPACE_NEEDED_FOR_GRAND_TOTAL > pageHeight - pageMarginBottom) {
      // If true, start a new page.
      doc.addPage();
      
      // Reset Y position to top margin (e.g., 40pt)
      currentY = 40; 
    }
    
    // Set text color to blue (RGB: 0, 102, 204)
    doc.setTextColor(0, 102, 204); 
        
    doc.setFontSize(14);
    doc.setFont('helvetica');
    doc.text(
      i18n.t('utils.total', {amount: formatAmount(groupedData.grandTotal)}),
      fullPageWidth - pageMargin,
      currentY,
      { align: 'right' }
    );

    // CRITICAL: Reset the text color back to black for subsequent text/footer (if any)
    // Black is [0, 0, 0] or you can use the shorthand 0
    doc.setTextColor(0); 

    currentY += 40;

  } else {
    // ----------------------------------------------------
    // CASE 2: Render Single Table (Existing Logic)
    // ----------------------------------------------------

    // --- Build the table data rows ---
    const rows = sortedExpenses.map(mapExpenseToTableRow);

    // --- Calculate total of Final Amounts ---
    const totalFinalCents = sortedExpenses.reduce((sum, exp) => sum + exp.expenseAmountDefault, 0);
    const totalFinalAmount = formatAmount(totalFinalCents);

    // Add section title and description for the single table view
    doc.setFontSize(12);
    doc.setFont('helvetica');
    doc.text(i18n.t('utils.detailed_exp'), pageMargin, currentY);
    currentY += 16;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const tableDescription = i18n.t('utils.detailed_exp_msg');
    const splitTableDescription = doc.splitTextToSize(tableDescription, fullPageWidth - pageMargin * 2);
    doc.text(splitTableDescription, pageMargin, currentY);
    currentY += splitTableDescription.length * 12 + 10; 
    
    // Insert the single table
    autoTable(doc, {
      startY: currentY,
      head: [headers],
      body: rows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 102, 204], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { left: pageMargin, right: pageMargin },
      columnStyles: {
        4: { halign: 'right' }, // Original Amount (index 4)
        5: { halign: 'right' }  // Final Amount (index 5)
      }
    });

    // 1. Get the final Y position after the table is drawn
    const lastTable = (doc as any).lastAutoTable;
    if (lastTable && lastTable.finalY !== undefined) {
      currentY = lastTable.finalY + 30;
    } else {
      // Fallback if position is not found
      currentY += 100; 
    }

    // 2. Perform page break check before Grand Total (same logic as grouped case)
    const SPACE_NEEDED_FOR_GRAND_TOTAL = 40; 
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageMarginBottom = 40; 

    if (currentY + SPACE_NEEDED_FOR_GRAND_TOTAL > pageHeight - pageMarginBottom) {
      doc.addPage();
      currentY = 40; 
    }
    
    // 3. Draw Grand Total Text (same styling as grouped case)
    doc.setTextColor(0, 102, 204); // Blue color
    doc.setFontSize(14);
    doc.setFont('helvetica');
    doc.text(
      i18n.t('utils.total', {amount: totalFinalAmount}),// Use the calculated total amount
      fullPageWidth - pageMargin,
      currentY,
      { align: 'right' }
    );
    
    doc.setTextColor(0); // Reset to black
    currentY += 40; // Space after grand total
  }

  // --- Footer (Page Numbering) ---
  const totalPages = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const pageText = i18n.t('utils.page_num', {count: i, total: totalPages});
    const xPos = fullPageWidth - pageMargin;
    const yPos = pageHeight - 20;
    doc.text(pageText, xPos, yPos, { align: 'right' });
  }

  /*
    10. Convert the PDF into base64 and build filename
    11. Save file (native or web)
  */
  const pdfOutput = doc.output('datauristring');
  const pdfBase64 = pdfOutput.split(',')[1];

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const fileName = `expenses_${dateStr}.pdf`;

  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Documents,
      });
      return fileName;
    } catch (err) {
      console.error("Failed to save PDF:", err);
    }
  } else {
    // Web: download
    doc.save(fileName);
    return fileName;
  }
};



/**
 * Calculates a value as a percentage of a total and formats it as a string.
 * * @param value The numerator (the part).
 * @param total The denominator (the whole).
 * @param decimals The number of decimal places to include (default is 1).
 * @returns A formatted percentage string (e.g., "15.3%"). Returns "0.0%" if total is zero.
 */
export const formatPercentage = (
  value: number, 
  total: number, 
  decimals: number = 1
): string => {
  if (total === 0 || isNaN(total) || total === null) {
      // Return 0.0% if the total is zero or invalid to prevent division by zero errors
      return `0.${'0'.repeat(decimals)}%`;
  }

  const percentage = (value / total) * 100;
  
  // Use toFixed() for consistent decimal places and string conversion
  return `${percentage.toFixed(decimals)}%`;
};




/**
 * Calculates percentage change using the decimal.js library 
 * for guaranteed arbitrary precision.
 
export function percentageChange(
  previous: number,
  current: number,
  decimals: number = 2
): number {
  if (previous === 0 || isNaN(previous) || isNaN(current)) return 0;

  // 1. Convert inputs to Decimal objects
  const prev = new Decimal(previous);
  const curr = new Decimal(current);

  // 2. Perform the calculation: ((current - previous) / previous) * 100
  const rawChange = curr
    .minus(prev)     // current - previous
    .dividedBy(prev) // / previous
    .times(100);     // * 100


  // 3. Round to the specified number of decimal places.
  // toFixed(d) returns a string, so we convert back to a number.
  // The rounding is handled correctly by the Decimal object.
  const resultString = rawChange.toFixed(decimals);
  
  return Number(resultString);
}
*/



import { toPng } from 'html-to-image';

/**
 * Captures a Recharts chart (hidden or visible) as a high-quality PNG.
 * 
 * @param element The chart container element (e.g. ref.current)
 * @param options Optional overrides for pixel ratio and scaling
 * @returns Base64 data URL of the chart PNG
 
export async function getRechartsImage(
  element: HTMLElement,
  options?: { pixelRatio?: number; scale?: number }
): Promise<string> {
  if (!element) throw new Error("Chart element not found");

  const { pixelRatio = 3, scale = 1.5 } = options || {};

  return await toPng(element, {
    pixelRatio,
    backgroundColor: "white",
    style: {
      transform: `scale(${scale})`,
      transformOrigin: "top left",
    },
  });
}
*/


// Utility: format date
export const formatDate = (date: Date, locale: string) => {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (date.getFullYear() !== new Date().getFullYear()) options.year = "numeric";
  return date.toLocaleDateString(locale, options);
};
