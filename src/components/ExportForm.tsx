import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from 'react-i18next';

import { useLiveQuery } from 'dexie-react-hooks';
import { toPng } from 'html-to-image';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from "@capacitor/core";
import { Share } from '@capacitor/share';


import logo from '/assets/images/logo.png';


// App components 
import PrintableYearlyChart from './charts/PrintableYearlyChart';
import PrintableMonthlyChart from './charts/PrintableMonthlyChart';

import { useCurrency } from "../context/CurrencyContext";


// Utilities
import { getExpensesWithCategories, exportExpensesToCSV, exportExpensesToPDF } from '../utils/chartFunctions';  

import {
  IonCol,
  IonGrid,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonRadioGroup,
  IonRadio,
  IonRow,
  IonToggle,
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar 

} from "@ionic/react";
import { db, Expense, Category } from "../db"; // adjust import as needed

import '../Main.css';
import '../pages/ExportData.css';
import { caretDownOutline, closeOutline, cloudUploadOutline } from "ionicons/icons";

// Add this helper function outside or inside your component/file
const urlToBase64 = async (url: string): Promise<string> => {
  try {
      // Fetch the image data
      const response = await fetch(url);
      if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      // Convert to a Blob
      const blob = await response.blob();
      
      // Convert Blob to a Base64 Data URL
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
      });
  } catch (error) {
      console.error("Error converting URL to Base64:", error);
      return ""; // Return an empty string or undefined on failure
  }
};

const ExportForm: React.FC = () => {
  const { t } = useTranslation();
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth(); // 0 = January

  const months = [
    "all_year",
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ] as const;

  type Month = typeof months[number]; // "All" | "January" | ... | "December"
  type ExportFormat = "csv" | "pdf";
  const { currency } = useCurrency();


  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<Month>(months[currentMonthIndex + 1]); // +1 because months[0] = "All", months[1] = "January"
  const [showMonthPicker, setShowMonthPicker] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const categories = useLiveQuery(() => db.categories.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());
  
  
  const [fileType, setFileType] = useState<"pdf" | "csv">("pdf");
  const [separateByCategory, setSeparateByCategory] = useState<boolean>(false);
  const [expenses, setExpenses] = useState<(Expense & { category: Category | null })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [backupPath, setBackupPath] = useState('');
  const modalRef = useRef<HTMLIonModalElement>(null);
  const isIOS = Capacitor.getPlatform() === "ios";
  const PDF_CHART_WIDTH_PT = 350; // Use 350pt for a smaller chart


  // Load all years that have at least one expense
  useEffect(() => {
    const loadYears = async () => {
      const yearsSet = new Set<number>();

      await db.expenses
        .orderBy("expenseDate")
        .each((expense: Expense) => {
          const year = new Date(expense.expenseDate).getFullYear();
          if (!isNaN(year)) yearsSet.add(year);
        });

      const years = Array.from(yearsSet).sort((a, b) => b - a); // newest first

      if (years.length === 0) {
        setAvailableYears([currentYear]);
        setYear(currentYear);
      } else {
        setAvailableYears(years);
        setYear(years.includes(currentYear) ? currentYear : years[0]);
      }
    };

    loadYears();
  }, []);


  // Load expenses for selected period  
  useEffect(() => {
    let isCancelled = false;

    const loadExpenses = async () => {
      setIsLoading(true);

      const { startDate, endDate } = getPeriodRange(year, month);
      setStartDate(startDate);
      setEndDate(endDate);

      try {
        const data = await getExpensesWithCategories(startDate, endDate);
        if (isCancelled) return;
  
        setExpenses(data);
      } catch (err) {
        console.error("Error loading expenses", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };
  
    loadExpenses();
    return () => {
      isCancelled = true;
    };
  }, [year, month]);


  // Toggle include chart to false when exporting to csv
  useEffect(() => {
    if (fileType === "csv") {
      setSeparateByCategory(false);
    }
  }, [fileType]);


  // Get start and end date for the selected period in Export Data
  const getPeriodRange = (year: number, month: Month) => {
    let startDate: Date;
    let endDate: Date;
  
    if (month === "all_year") {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    } else {
      const monthIndex = months.indexOf(month) - 1; // months[0] = "All"
      startDate = new Date(year, monthIndex, 1);
      endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    }
  
    return { startDate, endDate };
  };


  // Inside ExportForm component, before handleExport
// Add this helper function to prepare the data structure for the PDF
const groupExpensesByCategory = (
  expenses: (Expense & { category: Category | null })[],
) => {
  const groupedData: {
    [key: string]: {
      categoryName: string;
      expenses: (Expense & { category: Category | null })[];
      subtotal: number;
    };
  } = {};

  let grandTotal = 0;

  for (const expense of expenses) {
    const categoryId = expense.categoryId || 'uncategorized';
    const categoryName = expense.category?.categoryName || t('categories.uncategorized');
    grandTotal += expense.expenseAmountDefault;

    if (!groupedData[categoryId]) {
      groupedData[categoryId] = {
        categoryName,
        expenses: [],
        subtotal: 0,
      };
    }

    groupedData[categoryId].expenses.push(expense);
    groupedData[categoryId].subtotal += expense.expenseAmountDefault;
  }

  // Convert map to array for easier iteration in PDF generation
  const categoryTables = Object.values(groupedData).sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName)
  );

  return { categoryTables, grandTotal };
};


  // Handle export logic
  const handleExport = async (format: ExportFormat = "csv") => {
    let chartDataUrl: string | undefined = undefined;
    let logoDataUrl: string | undefined = undefined; 
    let timeFrame = '';

    month === "all_year" ? timeFrame = "year" : timeFrame = "month";

    try {
      if (format === "pdf") {
        // LOGO CONVERSION LOGIC (Using the imported URL)
        if (logo) {
          // Convert the imported URL path to a Base64 string
          logoDataUrl = await urlToBase64(logo);
          
          // The result will be a data URL (e.g., 'data:image/png;base64,....'), 
          // which is exactly what jsPDF's addImage expects.
          if (logoDataUrl.length < 100) {
                console.warn("Logo Base64 conversion failed or resulted in a short string.");
                logoDataUrl = undefined;
          }
        }

        // 1. CHART CAPTURE LOGIC (for PDF only)
        const chartElement = document.getElementById('pdf-chart-container');
        
        // DEBUG: Check if the element exists. Continue with PDF creation without chart, or stop
        if (!chartElement) {
          console.error("DEBUG: Chart element #pdf-chart-container not found!");
        } else {
          chartDataUrl =await toPng(chartElement, {
            quality: 0.95, // Set a high quality for the image
            backgroundColor: '#FFFFFF', // Ensure a white background if your chart is transparent
          });

          if (chartDataUrl.length < 1000) { // Base64 images are usually long
            console.error("DEBUG: Data URL seems too short, capture likely failed!");
          }
        }
      }

      // 1. Group Data if necessary
      let groupedData:
      | { categoryTables: any[]; grandTotal: number }
      | undefined = undefined;

      if (format === 'pdf' && separateByCategory) {
        groupedData = groupExpensesByCategory(expenses);
        
        if (groupedData && groupedData.categoryTables.length === 0) {
          console.warn("DEBUG 3: Grouped data has 0 categories. This will lead to an empty report.");
        }
      }
  
      // Dynamically pick export function
      const exportFn = format === "pdf" ? exportExpensesToPDF : exportExpensesToCSV;

      // 2. Pass the local variable (chartDataUrl) to the utility
      // It's already string | undefined, so no complex nullish coalescing needed here
      const filename = await exportFn(
        expenses,
        categories ?? [],
        accounts ?? [],
        currency.defaultCurrency,
        timeFrame,
        chartDataUrl, 
        startDate,
        endDate,
        PDF_CHART_WIDTH_PT,
        logoDataUrl,
        groupedData,
      );

      // Filesystem and modal logic
      if (!filename) return;
  
      const { uri } = await Filesystem.getUri({
        directory: Directory.Documents,
        path: filename,
      });
  
      setBackupPath(uri);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Failed to export expenses:", error);
    }
  }; 
  

  // Share button logic
  const handleShare = async () => {
    try {
      if (!backupPath) {
        alert(t('export.no_export_file'));
        return;
      }
      
      await Share.share({
        title: t('export.share_file'),
        text: t('export.share_file_msg'),
        url: backupPath,
        dialogTitle: t('export.share_file'),
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Sharing failed:', err);
    }
  };

  const hasExpenses = expenses.length;
  const pdfOptionsDisabled = fileType !== "pdf";

  return (
    <div className="mt-30">
      {/* Period Section */}
      <div>
        <p className="mb-0">{t('date.period')}</p>
        <div className="flex-row">
          <IonItem onClick={() => setShowMonthPicker(true)}>
            <span>{year}</span>
            <span className="period-month-label">{month ? t(`date.${month}`) : t("date.select_month")}</span>
            <IonIcon icon={caretDownOutline} slot="end" className="caret-icon"></IonIcon>
          </IonItem>
        </div>
      </div>

      {/* File type section */}
      <div className="mt-20">
        <p className="mb-0">{t('export.export_as')}</p>
        <IonRadioGroup
          value={fileType}
          onIonChange={(e) => setFileType(e.detail.value)}
        >
          <div className="flex-row">
            <IonItem className="item-transparent">
              <IonLabel>{t('export.pdf_file')}</IonLabel>
              <IonRadio slot="start" value="pdf" />
            </IonItem>
            <IonItem className="item-transparent">
              <IonLabel>{t('export.csv_file')}</IonLabel>
              <IonRadio slot="start" value="csv" />
            </IonItem>
          </div>
        </IonRadioGroup>
      </div>

      {/* PDF options */}
      <div className={`mt-20 ${fileType === "csv" ? "disabled" : ""}`}>

        {/* Group by category toggle */}
        <div
          className={`toggle-row ${pdfOptionsDisabled ? 'disabled' : ''}`}
          onClick={() => {
            if (!pdfOptionsDisabled) {
              setSeparateByCategory(prev => !prev);
            }
          }}
        >
          <IonToggle
            checked={separateByCategory}
            disabled={pdfOptionsDisabled}
          />
          <span>{t('export.grouped')}</span>
        </div>

        {/* Show chart only when fully loaded */}
        {isLoading ? (
          <div className="no-chart-available">
            <p>{t('common.loading')}</p>
          </div>
        ) : hasExpenses === 0 ? (
          <div className="no-chart-available">
            {t('expenses.none_to_display')}
          </div>
        ) : (
          <>
            <div className="no-chart-available"></div>
            {/* Inside your IonContent, but outside the main visible chart section: */}  
            <div style={{ position: 'absolute', left: '-9999px', top: '0', zIndex: -1 }}>
              {/* The container where the chart will render for PDF purposes */}
              <div id="pdf-chart-container" style={{ width: `${PDF_CHART_WIDTH_PT}pt` }}>
                {/* We place the dynamic chart components here. 
                  The actual width for PDF is around 500pt to 520pt (A4 minus margins).
                  The height can be adjusted based on your desired aspect ratio.
                */}
              {/* Charts */}
              {month === "all_year" ? (
                <PrintableYearlyChart expenses={expenses} />
              ) : (
                <PrintableMonthlyChart expenses={expenses} categories={categories} />
              )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Export button */}
      <div className="ion-text-center">
      <IonButton
        expand="block"
        onClick={() => handleExport(fileType)}
        disabled={hasExpenses === 0}
      >
          {t('export.export')}
        </IonButton>
      </div>

      {/* Period selection modal */}
      <IonModal isOpen={showMonthPicker} onDidDismiss={() => setShowMonthPicker(false)}>
        <IonHeader className="ion-no-border">
          <IonToolbar className="transparent">
            <IonTitle>{t('date.select_period')}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowMonthPicker(false)}>
                <IonIcon aria-hidden="true" icon={closeOutline} className="close-modal"></IonIcon>
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <div className="month-picker-modal ion-padding">

            {/* Year selection */}
            <h5 className="picker-section-title">{t('date.select_year')}</h5>
            <IonGrid className="year-picker-grid">
              <IonRow>
                {availableYears.map((y) => (
                  <IonCol size="4" key={y}>
                    <div
                      className={`year-item ${year === y ? "selected" : ""}`}
                      onClick={() => setYear(y)}
                    >
                      {y}
                    </div>
                  </IonCol>
                ))}
              </IonRow>
            </IonGrid>

            {/* Month selection */}
            <h5 className="picker-section-title mt-20">{t('date.select_month')}</h5>

            <IonGrid className="month-picker-grid">
              <IonRow>
                <IonCol size="12" className="month-col">
                  <div
                    className={`month-item all-option ${month === "all_year" ? "selected" : ""}`}
                    onClick={() => { 
                      setMonth("all_year"); 
                      setShowMonthPicker(false); 
                    }}
                  >
                    {t('date.all_year')}
                  </div>
                </IonCol>
              </IonRow>

              <IonRow>
                {months.slice(1).map((m) => (
                  <IonCol size="4" key={m} className="month-col">
                    <div
                      className={`month-item ${month === m ? "selected" : ""}`}
                      onClick={() => { 
                        setMonth(m); 
                        setShowMonthPicker(false); 
                      }}
                    >
                      {t(`date.${m}`)}
                    </div>
                  </IonCol>
                ))}
              </IonRow>
            </IonGrid>

          </div>
        </IonContent>
      </IonModal>

      {/* Modal for backup confirmation and share */}
      <IonModal 
        ref={modalRef} 
        isOpen={isModalOpen} 
        onDidDismiss={() => setIsModalOpen(false)}
        initialBreakpoint={0.3}
        breakpoints={[0, 0.3, 0.5, 1]}
        backdropBreakpoint={0.3}
      >
        <div className="centered-container pt-10">
          <IonIcon className='sheet-modal-icon' icon={cloudUploadOutline} />
          <h3 className='sheet-modal-title'>{t('export.export_complete')}</h3>
          <p style={{ wordBreak: "break-all" }}>
            {isIOS
              ? t('export.export_complete_msg_ios')
              : t('export.export_complete_msg_other')}
          </p>

          <div className='flex mb-20'>
            <IonButton className='small-btn' onClick={handleShare}>{t('common.share')}</IonButton>
            <IonButton className='small-btn' color="medium" onClick={() => setIsModalOpen(false)}>{t('common.close')}</IonButton>
          </div>
        </div>
      </IonModal>
      
    </div>
  );
};

export default ExportForm;
