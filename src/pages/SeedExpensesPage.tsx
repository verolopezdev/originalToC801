import React from "react";
import { useTranslation } from 'react-i18next';
import { Preferences } from '@capacitor/preferences'; // Ensure this is imported

import { 
  IonItem,
  IonLabel,
  IonInput,
  IonButton, 
  IonToast,
  IonBackButton,
  IonButtons, 
  IonContent, 
  IonHeader,  
  IonPage, 
  IonToolbar 
} from "@ionic/react";
import { db, setIsSeeding } from "../db"; // adjust path to your Dexie DB
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { useCurrency } from '../context/CurrencyContext';
import { useUser } from '../context/UserContext'; // Import the useUser hook
import Footer from '../components/Footer'

// Ion icon components
import { 
  add,
  cashOutline, 
  homeOutline,
  layersOutline, 
} from 'ionicons/icons';

// Footer items
const appPages = [
  {
    title: 'home',
    url: '/dashboard',
    iosIcon: homeOutline,
    mdIcon: homeOutline
  },
  {
    title: 'accounts',
    url: '/accounts',
    iosIcon: layersOutline,
    mdIcon: layersOutline
  },
  {
    title: 'Add',
    url: '/newcategory',
    iosIcon: add,
    mdIcon: add
  },
  {
    title: 'activity',
    url: '/activity',
    iosIcon: cashOutline,
    mdIcon: cashOutline
  }
];


type Language = "en" | "es" | "fr" | "pt";

type MerchantsByCategory = Record<number, string[]>;

type Translation = {
  rent: string;
  monthlyBill: string;
  groceries: string;
  transport: string;
  subscription: string;
  membership: string;
  shopping: string;
  personalCare: string;
  healthcare: string;
  merchants: MerchantsByCategory;
};

type Translations = Record<Language, Translation>;

const SeedExpensesPage: React.FC = () => {
  const { currency } = useCurrency();
  const { t } = useTranslation();
  
  const [years, setYears] = React.useState<number>(1); // Default to 1 year
  const [showToast, setShowToast] = React.useState(false);

  // Translate footer menu items
  const translatedMenuItems = appPages.map((item) => ({
    ...item,
    title: t(`common.${item.title}`, { defaultValue: item.title }),
  }));
  

  const seedExpenses = async () => {
    try {
      // 1. SILENCE THE HOOKS
      setIsSeeding(true);
      
      // 2. Wrap everything in a Read/Write transaction
      // We include expenses, recurringSeries, and changes in the scope
      await db.transaction('rw', [db.expenses, db.recurringSeries], async () => {
        
        // Clear existing data within the transaction
        await db.expenses.clear();
  
        const expenses: any[] = [];
        let expenseId = 1;
  
        const now = new Date();
        const totalMonths = years * 12;
  
        const currencyCode = currency.defaultCurrency?.code || "USD";
        const locale = currency.defaultCurrency?.locale || "en-US";
  
        const language: Language = locale.startsWith("es")
          ? "es"
          : locale.startsWith("fr")
          ? "fr"
          : locale.startsWith("pt")
          ? "pt"
          : "en";
  
        const base = {
          rent: 95000,
          utilities: [4500, 6200, 5800],
          groceries: [3200, 5400, 7600, 8800],
          transport: [1200, 2200, 1800],
          phone: 2999,
          dining: [1800, 2400, 3200, 4200],
          entertainment: [999, 1299],
          shopping: [4500, 7200, 9800],
          fitness: 2599,
          personalCare: [2800, 3600],
          healthcare: [1800, 3200, 5400, 8900],
          travel: [12000, 24000],
        };
  
        const translations: Translations = {
          en: {
            rent: "Apartment Rent",
            monthlyBill: "Monthly Bill",
            groceries: "Groceries",
            transport: "Transport",
            subscription: "Subscription",
            membership: "Membership",
            shopping: "Shopping",
            personalCare: "Personal Care",
            healthcare: "Healthcare",
            merchants: {
              2: ["Apartment Rent"],
              3: ["BrightEnergy", "AquaFlow Utilities"],
              4: ["FreshMart", "CityMarket", "Local Harvest"],
              5: ["Metro Transit", "CityRide"],
              6: ["City Pharmacy", "Health Clinic", "Dental Center"],
              7: ["HomeNet Mobile"],
              8: ["Urban Coffee Co.", "Green Fork Bistro", "Daily Bites"],
              9: ["Streamio", "TuneBox"],
              10: ["Urban Style", "Trendora"],
              11: ["FitPlus"],
              12: ["Wellness Spa", "CarePoint"],
              15: ["AirFly", "Hotel Lumière"],
            }
          },
          es: {
            rent: "Alquiler",
            monthlyBill: "Factura mensual",
            groceries: "Supermercado",
            transport: "Transporte",
            subscription: "Suscripción",
            membership: "Membresía",
            shopping: "Compras",
            personalCare: "Cuidado personal",
            healthcare: "Salud",
            merchants: {
              2: ["Alquiler"],
              3: ["BrightEnergy", "AquaFlow Servicios"],
              4: ["FreshMart", "CityMarket", "Local Harvest"],
              5: ["Metro Transit", "CityRide"],
              6: ["Farmacia Central", "Clínica Salud", "Centro Dental"],
              7: ["HomeNet Móvil"],
              8: ["Urban Coffee Co.", "Green Fork Bistro", "Daily Bites"],
              9: ["Streamio", "TuneBox"],
              10: ["Urban Style", "Trendora"],
              11: ["FitPlus"],
              12: ["Wellness Spa", "CarePoint"],
              15: ["AirFly", "Hotel Lumière"],
            }
          },
          fr: {
            rent: "Loyer",
            monthlyBill: "Facture mensuelle",
            groceries: "Courses",
            transport: "Transport",
            subscription: "Abonnement",
            membership: "Adhésion",
            shopping: "Achats",
            personalCare: "Soins personnels",
            healthcare: "Santé",
            merchants: {
              2: ["Loyer"],
              3: ["BrightEnergy", "AquaFlow Services"],
              4: ["FreshMart", "CityMarket", "Local Harvest"],
              5: ["Metro Transit", "CityRide"],
              6: ["Pharmacie Centrale", "Clinique Santé", "Centre Dentaire"],
              7: ["HomeNet Mobile"],
              8: ["Urban Coffee Co.", "Green Fork Bistro", "Daily Bites"],
              9: ["Streamio", "TuneBox"],
              10: ["Urban Style", "Trendora"],
              11: ["FitPlus"],
              12: ["Wellness Spa", "CarePoint"],
              15: ["AirFly", "Hotel Lumière"],
            }
          },
          pt: {
            rent: "Aluguel",
            monthlyBill: "Fatura mensal",
            groceries: "Supermercado",
            transport: "Transporte",
            subscription: "Assinatura",
            membership: "Plano",
            shopping: "Compras",
            personalCare: "Cuidados pessoais",
            healthcare: "Saúde",
            merchants: {
              2: ["Aluguel"],
              3: ["BrightEnergy", "AquaFlow Serviços"],
              4: ["FreshMart", "CityMarket", "Local Harvest"],
              5: ["Metro Transit", "CityRide"],
              6: ["Farmácia Central", "Clínica Saúde", "Centro Odontológico"],
              7: ["HomeNet Mobile"],
              8: ["Urban Coffee Co.", "Green Fork Bistro", "Daily Bites"],
              9: ["Streamio", "TuneBox"],
              10: ["Urban Style", "Trendora"],
              11: ["FitPlus"],
              12: ["Wellness Spa", "CarePoint"],
              15: ["AirFly", "Hotel Lumière"],
            }
          }
        };
  
        const randomFrom = (arr: number[]) =>
          arr[Math.floor(Math.random() * arr.length)];
  
        const randomMerchant = (catId: number): string => {
          const merchants = translations[language].merchants[catId];
          return (!merchants || merchants.length === 0) 
            ? "Unknown Merchant" 
            : merchants[Math.floor(Math.random() * merchants.length)];
        };
  
        const addExpense = (date: Date, categoryId: number, amount: number, note: string) => {
          expenses.push({
            userId: 1,
            expenseId: expenseId++,
            accountId: 1,
            categoryId,
            subcategoryId: 0,
            expenseNote: note,
            expenseAmountDefault: amount,
            expenseAmountTrip: 0,
            expenseAmountAlt: 0,
            expenseCurrencyCode: currencyCode,
            expenseLocale: locale,
            tripId: null,
            expenseDate: date.toISOString(),
            isActive: 1,
          });
        };

        const weightedPick = <T extends { weight: number }>(items: T[]): T => {
          const totalWeight = items.reduce(
            (sum, item) => sum + item.weight,
            0
          );
        
          let random = Math.random() * totalWeight;
        
          for (const item of items) {
            random -= item.weight;
        
            if (random <= 0) {
              return item;
            }
          }
        
          return items[items.length - 1];
        };
        
        const randomDateInMonth = (
          year: number,
          month: number
        ): Date => {
          const lastDay = new Date(year, month + 1, 0).getDate();
        
          const day =
            Math.floor(Math.random() * lastDay) + 1;
        
          const hour = Math.floor(Math.random() * 24);
          const minute = Math.floor(Math.random() * 60);
        
          return new Date(
            year,
            month,
            day,
            hour,
            minute
          );
        };
        
        const categoryDefinitions = [
          {
            categoryId: 2,
            weight: 1,
            amounts: [base.rent],
            note: () => randomMerchant(2),
          },
          {
            categoryId: 3,
            weight: 3,
            amounts: base.utilities,
            note: () =>
              `${randomMerchant(3)} – ${translations[language].monthlyBill}`,
          },
          {
            categoryId: 4,
            weight: 25,
            amounts: base.groceries,
            note: () =>
              `${randomMerchant(4)} – ${translations[language].groceries}`,
          },
          {
            categoryId: 5,
            weight: 20,
            amounts: base.transport,
            note: () =>
              `${randomMerchant(5)} – ${translations[language].transport}`,
          },
          {
            categoryId: 6,
            weight: 5,
            amounts: base.healthcare,
            note: () =>
              `${randomMerchant(6)} – ${translations[language].healthcare}`,
          },
          {
            categoryId: 7,
            weight: 2,
            amounts: [base.phone],
            note: () =>
              `${randomMerchant(7)} – ${translations[language].monthlyBill}`,
          },
          {
            categoryId: 8,
            weight: 18,
            amounts: base.dining,
            note: () => randomMerchant(8),
          },
          {
            categoryId: 9,
            weight: 2,
            amounts: base.entertainment,
            note: () =>
              `${randomMerchant(9)} – ${translations[language].subscription}`,
          },
          {
            categoryId: 10,
            weight: 8,
            amounts: base.shopping,
            note: () =>
              `${randomMerchant(10)} – ${translations[language].shopping}`,
          },
          {
            categoryId: 11,
            weight: 1,
            amounts: [base.fitness],
            note: () =>
              `${randomMerchant(11)} – ${translations[language].membership}`,
          },
          {
            categoryId: 12,
            weight: 3,
            amounts: base.personalCare,
            note: () =>
              `${randomMerchant(12)} – ${translations[language].personalCare}`,
          },
          {
            categoryId: 15,
            weight: 1,
            amounts: base.travel,
            note: () => randomMerchant(15),
          },
        ];
  
        // Generation Loops
        for (let m = 0; m < totalMonths; m++) {
          const monthDate = new Date(
            now.getFullYear(),
            now.getMonth() - (totalMonths - 1) + m,
            1
          );
        
          const year = monthDate.getFullYear();
          const month = monthDate.getMonth();
        
          // Between 70 and 90 expenses
          const expensesThisMonth =
            70 + Math.floor(Math.random() * 21);
        
          for (let i = 0; i < expensesThisMonth; i++) {
            const category =
              weightedPick(categoryDefinitions);
        
            const date = randomDateInMonth(
              year,
              month
            );
        
            // Prevent future expenses
            if (date > now) {
              continue;
            }
        
            addExpense(
              date,
              category.categoryId,
              randomFrom(category.amounts),
              category.note()
            );
          }
        }  

        expenses.sort(
          (a, b) =>
            new Date(a.expenseDate).getTime() -
            new Date(b.expenseDate).getTime()
        );
        
        // Final batch add
        await db.expenses.bulkAdd(expenses);
        console.log(`Transaction successful: Seeded ${expenses.length} expenses.`);
      });
  
      setShowToast(true);
  
    } catch (error) {
      console.error("Seeding transaction failed:", error);
    } finally {
      // 2. RE-ENABLE THE HOOKS
      // We use a tiny delay to ensure all micro-tasks from the transaction are finished
      setTimeout(() => setIsSeeding(false), 500);
    }
  };


  const downloadCSV = async () => {
    const expenses = await db.expenses.toArray();
    const categories = await db.categories.toArray();
  
    const categoryMap = categories.reduce<Record<number, string>>((acc, cat) => {
      acc[cat.categoryId] = cat.categoryName;
      return acc;
    }, {});
  
    // 🪙 Currency + locale setup
    const { locale, symbol, decimalSeparator, thousandSeparator } = currency.defaultCurrency || {
      locale: "en-US",
      symbol: "$",
      decimalSeparator: ".",
      thousandSeparator: ",",
    };
  
    // Use ; if decimal separator is a comma
    const separator = decimalSeparator === "," ? ";" : ",";
  
    // 🗓️ Sort expenses by date ascending
    const sortedExpenses = [...expenses].sort(
      (a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime()
    );
  
    // 💰 Format amount with symbol + thousands/decimal separators
    const formatAmount = (amountCents: number): string => {
      const amount = amountCents / 100;
      let [intPart, decPart] = amount.toFixed(2).split(".");
  
      // Add thousand separators manually
      intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
  
      return `${symbol}${intPart}${decimalSeparator}${decPart}`;
    };
  
    const csvRows = [
      ["date", "categoryName", "expenseNote", "amount"],
      ...sortedExpenses.map(exp => [
        new Date(exp.expenseDate).toLocaleDateString(locale),
        categoryMap[exp.categoryId] || `Category ${exp.categoryId}`,
        exp.expenseNote,
        formatAmount(exp.expenseAmountDefault),
      ]),
    ];
  
    // 🧠 Escape fields that include separators, quotes or line breaks
    const escapeCell = (cell: string | number) => {
      const str = String(cell);
      return str.includes(separator) || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };
  
    const csvContent = csvRows
      .map(row => row.map(escapeCell).join(separator))
      .join("\n");
  
    // 📁 File name with currency and date
    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = `expenses_${currency.defaultCurrency?.code || "CUR"}_${dateStr}.csv`;
  
    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: csvContent,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        alert(
          `CSV saved (${fileName}) using ${separator === ";" ? "semicolon (;)" : "comma (,)" } separator based on your currency locale.`
        );
      } catch (err) {
        console.error("Failed to save CSV:", err);
        alert("Error saving CSV on device");
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
    }
  };

  // Helper to create a pause
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));





  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal">
        <section>
          <h1>Seed Expenses</h1>
        </section>

        <IonLabel position="stacked">Years of Data</IonLabel>
        <IonItem mode="md" style={{ marginBottom: '1rem' }}>
          
          <IonInput 
            type="number" 
            value={years} 
            min={1} 
            max={10}
            onIonInput={(e) => setYears(parseInt(e.detail.value!, 10) || 1)}
          />
        </IonItem>

        <IonButton expand="block" onClick={seedExpenses}>
          Generate Random Expenses
        </IonButton>

        <IonButton expand="block" color="secondary" onClick={downloadCSV} style={{ marginTop: "1rem" }}>
          Download Expenses CSV
        </IonButton>


        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message="Random test expenses generated!"
          duration={2000}
        />
      </IonContent>

      <Footer appPages={translatedMenuItems} />

    </IonPage>
  );
};

export default SeedExpensesPage;
