import React from "react";
import { useTranslation } from 'react-i18next';

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
import { useUser } from '../context/UserContext';
import Footer from '../components/Footer';

// Ion icon components
import { 
  add,
  cashOutline, 
  homeOutline,
  layersOutline, 
} from 'ionicons/icons';

// Footer items
interface AppPage {
  url: string;
  icon: string;
  title: string;
}

const appPages: AppPage[] = [
  { title: 'dashboard', url: '/app/dashboard', icon: homeOutline },
  { title: 'accounts', url: '/app/accounts', icon: layersOutline },
  { title: 'Add', url: '/app/newexpense/0', icon: add },
  { title: 'activity', url: '/app/activity', icon: cashOutline }
];

type Language = "en" | "es" | "fr" | "pt";

type MerchantsByCategory = Record<string, string[]>;

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

interface SeedContext {
  accountId: any;
  findCatId: (name: string) => any;
}

// ----------------------------------------------------------------------
// Async Helper: Resolves prerequisite data (Account ID & Categories)
// ----------------------------------------------------------------------
const getSeedContext = async (): Promise<SeedContext | null> => {
  // 1. Fetch default account
  const accounts = await db.accounts.limit(1).toArray();
  if (accounts.length === 0) {
    alert("No accounts found. Please create an account before seeding expenses.");
    return null;
  }
  const accountId = accounts[0].accountId;

  // 2. Fetch categories
  const categories = await db.categories.toArray();
  if (categories.length === 0) {
    alert("No categories found. Please setup categories first.");
    return null;
  }

  // 3. Category ID mapping helper
  const findCatId = (name: string): any => {
    const found = categories.find(
      (c) => c.categoryName?.toLowerCase() === name.toLowerCase()
    );
    return found ? found.categoryId : categories[0].categoryId;
  };

  return { accountId, findCatId };
};

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
const SeedExpensesPage: React.FC = () => {
  const { currency } = useCurrency();
  const { t } = useTranslation();
  const { userId } = useUser();
  const [years, setYears] = React.useState<number>(1);
  const [showToast, setShowToast] = React.useState(false);

  const translatedMenuItems = appPages.map((item) => ({
    ...item,
    title: t(`common.${item.title}`, { defaultValue: item.title }),
  }));

  const seedExpenses = async () => {
    try {
      setIsSeeding(true);

      // Fetch dynamic Database Context
      const context = await getSeedContext();
      if (!context) return;

      const { accountId, findCatId } = context;

      await db.transaction('rw', [db.expenses, db.recurringSeries], async () => {
        await db.expenses.clear();

        const expenses: any[] = [];
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
              rent: ["Apartment Rent"],
              utilities: ["BrightEnergy", "AquaFlow Utilities"],
              groceries: ["FreshMart", "CityMarket", "Local Harvest"],
              transport: ["Metro Transit", "CityRide"],
              healthcare: ["City Pharmacy", "Health Clinic", "Dental Center"],
              phone: ["HomeNet Mobile"],
              dining: ["Urban Coffee Co.", "Green Fork Bistro", "Daily Bites"],
              entertainment: ["Streamio", "TuneBox"],
              shopping: ["Urban Style", "Trendora"],
              fitness: ["FitPlus"],
              personalCare: ["Wellness Spa", "CarePoint"],
              travel: ["AirFly", "Hotel Lumière"],
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
              rent: ["Alquiler"],
              utilities: ["BrightEnergy", "AquaFlow Servicios"],
              groceries: ["FreshMart", "CityMarket", "Local Harvest"],
              transport: ["Metro Transit", "CityRide"],
              healthcare: ["Farmacia Central", "Clínica Salud", "Centro Dental"],
              phone: ["HomeNet Móvil"],
              dining: ["Urban Coffee Co.", "Green Fork Bistro", "Daily Bites"],
              entertainment: ["Streamio", "TuneBox"],
              shopping: ["Urban Style", "Trendora"],
              fitness: ["FitPlus"],
              personalCare: ["Wellness Spa", "CarePoint"],
              travel: ["AirFly", "Hotel Lumière"],
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
              rent: ["Loyer"],
              utilities: ["BrightEnergy", "AquaFlow Services"],
              groceries: ["FreshMart", "CityMarket", "Local Harvest"],
              transport: ["Metro Transit", "CityRide"],
              healthcare: ["Pharmacie Centrale", "Clinique Santé", "Centre Dentaire"],
              phone: ["HomeNet Mobile"],
              dining: ["Urban Coffee Co.", "Green Fork Bistro", "Daily Bites"],
              entertainment: ["Streamio", "TuneBox"],
              shopping: ["Urban Style", "Trendora"],
              fitness: ["FitPlus"],
              personalCare: ["Wellness Spa", "CarePoint"],
              travel: ["AirFly", "Hotel Lumière"],
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
              rent: ["Aluguel"],
              utilities: ["BrightEnergy", "AquaFlow Serviços"],
              groceries: ["FreshMart", "CityMarket", "Local Harvest"],
              transport: ["Metro Transit", "CityRide"],
              healthcare: ["Farmácia Central", "Clínica Saúde", "Centro Odontológico"],
              phone: ["HomeNet Mobile"],
              dining: ["Urban Coffee Co.", "Green Fork Bistro", "Daily Bites"],
              entertainment: ["Streamio", "TuneBox"],
              shopping: ["Urban Style", "Trendora"],
              fitness: ["FitPlus"],
              personalCare: ["Wellness Spa", "CarePoint"],
              travel: ["AirFly", "Hotel Lumière"],
            }
          }
        };

        const randomFrom = (arr: number[]) =>
          arr[Math.floor(Math.random() * arr.length)];

        const randomMerchant = (key: string): string => {
          const merchants = translations[language].merchants[key];
          return (!merchants || merchants.length === 0) 
            ? "Unknown Merchant" 
            : merchants[Math.floor(Math.random() * merchants.length)];
        };

        const addExpense = (date: Date, categoryId: any, amount: number, note: string) => {
          expenses.push({
            userId,
            accountId, // Dynamically set from DB
            categoryId, // Dynamically set from DB
            // expenseId is omitted to allow Dexie Cloud auto-generation
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
          const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
          let random = Math.random() * totalWeight;
          for (const item of items) {
            random -= item.weight;
            if (random <= 0) return item;
          }
          return items[items.length - 1];
        };

        const randomDateInMonth = (year: number, month: number): Date => {
          const lastDay = new Date(year, month + 1, 0).getDate();
          const day = Math.floor(Math.random() * lastDay) + 1;
          const hour = Math.floor(Math.random() * 24);
          const minute = Math.floor(Math.random() * 60);
          return new Date(year, month, day, hour, minute);
        };

        const categoryDefinitions = [
          {
            categoryId: findCatId("Rent"),
            weight: 1,
            amounts: [base.rent],
            note: () => randomMerchant("rent"),
          },
          {
            categoryId: findCatId("Utilities"),
            weight: 3,
            amounts: base.utilities,
            note: () => `${randomMerchant("utilities")} – ${translations[language].monthlyBill}`,
          },
          {
            categoryId: findCatId("Groceries"),
            weight: 25,
            amounts: base.groceries,
            note: () => `${randomMerchant("groceries")} – ${translations[language].groceries}`,
          },
          {
            categoryId: findCatId("Transport"),
            weight: 20,
            amounts: base.transport,
            note: () => `${randomMerchant("transport")} – ${translations[language].transport}`,
          },
          {
            categoryId: findCatId("Healthcare"),
            weight: 5,
            amounts: base.healthcare,
            note: () => `${randomMerchant("healthcare")} – ${translations[language].healthcare}`,
          },
          {
            categoryId: findCatId("Phone"),
            weight: 2,
            amounts: [base.phone],
            note: () => `${randomMerchant("phone")} – ${translations[language].monthlyBill}`,
          },
          {
            categoryId: findCatId("Dining"),
            weight: 18,
            amounts: base.dining,
            note: () => randomMerchant("dining"),
          },
          {
            categoryId: findCatId("Entertainment"),
            weight: 2,
            amounts: base.entertainment,
            note: () => `${randomMerchant("entertainment")} – ${translations[language].subscription}`,
          },
          {
            categoryId: findCatId("Shopping"),
            weight: 8,
            amounts: base.shopping,
            note: () => `${randomMerchant("shopping")} – ${translations[language].shopping}`,
          },
          {
            categoryId: findCatId("Fitness"),
            weight: 1,
            amounts: [base.fitness],
            note: () => `${randomMerchant("fitness")} – ${translations[language].membership}`,
          },
          {
            categoryId: findCatId("Personal Care"),
            weight: 3,
            amounts: base.personalCare,
            note: () => `${randomMerchant("personalCare")} – ${translations[language].personalCare}`,
          },
          {
            categoryId: findCatId("Travel"),
            weight: 1,
            amounts: base.travel,
            note: () => randomMerchant("travel"),
          },
        ];

        for (let m = 0; m < totalMonths; m++) {
          const monthDate = new Date(
            now.getFullYear(),
            now.getMonth() - (totalMonths - 1) + m,
            1
          );

          const year = monthDate.getFullYear();
          const month = monthDate.getMonth();
          const expensesThisMonth = 70 + Math.floor(Math.random() * 21);

          for (let i = 0; i < expensesThisMonth; i++) {
            const category = weightedPick(categoryDefinitions);
            const date = randomDateInMonth(year, month);

            if (date > now) continue;

            addExpense(
              date,
              category.categoryId,
              randomFrom(category.amounts),
              category.note()
            );
          }
        }

        expenses.sort(
          (a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime()
        );

        await db.expenses.bulkAdd(expenses);
        console.log(`Transaction successful: Seeded ${expenses.length} expenses.`);
      });

      setShowToast(true);

    } catch (error) {
      console.error("Seeding transaction failed:", error);
    } finally {
      setTimeout(() => setIsSeeding(false), 500);
    }
  };

  const downloadCSV = async () => {
    const expenses = await db.expenses.toArray();
    const categories = await db.categories.toArray();

    const categoryMap = categories.reduce<Record<string, string>>((acc, cat) => {
      acc[cat.categoryId] = cat.categoryName;
      return acc;
    }, {});

    const { locale, symbol, decimalSeparator, thousandSeparator } = currency.defaultCurrency || {
      locale: "en-US",
      symbol: "$",
      decimalSeparator: ".",
      thousandSeparator: ",",
    };

    const separator = decimalSeparator === "," ? ";" : ",";

    const sortedExpenses = [...expenses].sort(
      (a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime()
    );

    const formatAmount = (amountCents: number): string => {
      const amount = amountCents / 100;
      let [intPart, decPart] = amount.toFixed(2).split(".");
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

    const escapeCell = (cell: string | number) => {
      const str = String(cell);
      return str.includes(separator) || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const csvContent = csvRows
      .map(row => row.map(escapeCell).join(separator))
      .join("\n");

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