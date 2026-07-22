import React, { useEffect, useState } from 'react';
import { db } from '../db';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';

// Custom hooks
import useBackButtonModalReset from "../hooks/useBackButtonModalReset";
import useScrollToTop from '../hooks/useScrollToTop';
import { useCurrency } from '../context/CurrencyContext';
import { useExchangeRates } from '../context/ExchangeRateContext';
import { getFlagImage } from '../utils/getExchangeRates';

// App component
import ExchangeRateDisplay from '../components/ExchangeRateDisplay';


// Ionic's components
import { 
  IonAvatar,
  IonBackButton,
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonIcon,
  IonImg,
  IonItem,
  IonLabel,
  IonModal,
  IonNote,
  IonPage, 
  IonSearchbar,
  IonToolbar 
} from '@ionic/react';

// Ion icon components
import { 
  airplaneOutline,
  caretDownOutline,
  closeOutline,
  lockClosedOutline,
  searchOutline,
  trashOutline
} from 'ionicons/icons';

// Styles
import '../Main.css';
import '../pages/CountrySelectionPage.css';

interface CurrencyData {
  name: string;
  code: string;
  locale: string;
  symbol: string;
  thousandSeparator: string;
  decimalSeparator: string;
}


const Currency: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { t } = useTranslation();
  const { themeColor } = useTheme(); 
  const color = themeColor.split("-")[1]; // Extracts color name from theme name
  const [usedCodes, setUsedCodes] = useState<string[]>([]);
  
  const { 
    currency, 
    allSelectedCurrencies,
    setDefaultCurrency,
    addAlternativeCurrency, 
    removeAlternativeCurrency, 
    updateActualCurrency 
  } = useCurrency();

  const [isDefCurrencyModalOpen, setIsDefCurrencyModalOpen] = useState(false);  

  const [isAltCurrencyModalOpen, setIsAltCurrencyModalOpen] = useState(false); // control modal for alternative currencies
  const [alternativeCurrencies, setAlternativeCurrencies] = useState<CurrencyData[]>([]); // State for alternative currencies
  const [hasDefaultCurrencyExpense, setHasDefaultCurrencyExpense] = useState<boolean | null>(null); // Holds true if there is one expense in default curr
  const [currencySearch, setCurrencySearch] = useState('');
  
  const [selectedCurrency, setSelectedCurrency] = useState<{
    code: string;
    name: string;
    symbol: string;
    locale: string;
  } | undefined>(undefined);

  const [actualCurrency, setActualCurrency] = useState<{
    code: string;
    name: string;
    symbol: string;
    locale: string;
  } | undefined>(undefined);

  // Use the custom hook to handle back button and reset modal state
  useBackButtonModalReset(isDefCurrencyModalOpen, setIsDefCurrencyModalOpen);
  useBackButtonModalReset(isAltCurrencyModalOpen, setIsAltCurrencyModalOpen);


  // Initialize state from currency context
  useEffect(() => {
    if (currency) {
      setSelectedCurrency(currency.defaultCurrency || undefined);
      setActualCurrency(currency.actualCurrency || undefined);
      setAlternativeCurrencies(allSelectedCurrencies.slice(1));
      
      const checkForDefaultCurrency = async () => {
        const result = await db.expenses
          .where('expenseCurrencyCode')
          .equals(currency.defaultCurrency.code)
          .first();
  
        setHasDefaultCurrencyExpense(!!result); // true if found, false if not
      };
  
      checkForDefaultCurrency();

      //refreshRates();
    }
  }, [currency]);

  // Get every alternative currency in use
  useEffect(() => {
    if(!currency.defaultCurrency.code) return;

    const fetchUsedCurrencyCodes = async () => {
      // 1. Get expense currency codes (from this year)
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
  
      const expenseCodes = await db.expenses
        .where('expenseDate')
        .between(startOfYear.toISOString(), endOfYear.toISOString(), true, false)
        .toArray();
  
      const filteredExpenseCodes = expenseCodes
        .map(e => e.expenseCurrencyCode)
        .filter(code => code !== currency.defaultCurrency.code);
  
      // 2. Get trip currency codes (no date filtering)
      const tripCodes = await db.trips
        .toArray(); 
  
      const filteredTripCodes = tripCodes
        .map(t => t.currencyCode)
        .filter(code => code !== currency.defaultCurrency.code);

      // 3. Get historic currency codes
      const historicList = await db.historicCurrencyList.get('all');
      const historicCurrencyCodes = historicList?.currencies ?? [];

      // 4. Merge and deduplicate
      const allCodes = [...filteredExpenseCodes, ...filteredTripCodes, ...historicCurrencyCodes];
      const distinctCodes = Array.from(new Set(allCodes));
  
      // 5. Update state
      setUsedCodes(distinctCodes);
    };
  
    fetchUsedCurrencyCodes();
  }, [currency.defaultCurrency.code]);
  

  const handleCurrencyChange = (currency: CurrencyData) => {
    // thousands and decimals separators
    const numberFormat = new Intl.NumberFormat(currency.locale);
    const exampleFormatted = numberFormat.format(1234567.89);
    
    // Add decimalSeparator before saving
    // It creates a new object called enrichedCurrency by:
    // Spreading all properties from the existing currency object
    // Adding two new properties: thousandSeparator and decimalSeparator
    const enrichedCurrency = {
      ...currency,
      thousandSeparator: exampleFormatted.replace(/\d/g, '').charAt(0),
      decimalSeparator: (1.1).toLocaleString(currency.locale).substring(1, 2),
    };
    
    setSelectedCurrency(enrichedCurrency);
    updateActualCurrency(enrichedCurrency);
    setDefaultCurrency(enrichedCurrency); // Update user context
  };

  // load currencies form json
  const [jsonCurrencies, setJsonCurrencies] = useState<CurrencyData[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetch("/assets/currency-codes.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(t('currency.failed_to_fetch_currency'));
        }
        return response.json();
      })
      .then((data: CurrencyData[]) => {
        setJsonCurrencies(data);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);


  const filteredCurrencies = jsonCurrencies.filter(currency => {
    const search = currencySearch.trim().toLowerCase();
  
    if (!search) return true;
  
    return (
      currency.name.toLowerCase().includes(search) ||
      currency.code.toLowerCase().includes(search) ||
      currency.symbol.toLowerCase().includes(search)
    );
  });


  // Add a new alternative currency
  const newAlternativeCurrency = (currency: CurrencyData) => {

    // thousands and decimals separators
    const numberFormat = new Intl.NumberFormat(currency.locale);
    const exampleFormatted = numberFormat.format(1234567.89);
    
    // Add decimalSeparator before pushing to list
    // It creates a new object called enrichedCurrency by:
    // Spreading all properties from the existing currency object
    // Adding two new properties: thousandSeparator and decimalSeparator
    const enrichedCurrency = {
      ...currency,
      thousandSeparator: exampleFormatted.replace(/\d/g, '').charAt(0),
      decimalSeparator: (1.1).toLocaleString(currency.locale).substring(1, 2),
    };
  
    // Only add if it's not already there
    if (!alternativeCurrencies.find((alt) => alt.code === currency.code)) {
      // It creates a new array called updatedCurrencies by:
      // Taking all the elements from the existing alternativeCurrencies array
      // Adding one more element to the end of the array: enrichedCurrency
      const updatedCurrencies = [...alternativeCurrencies, enrichedCurrency];
      setAlternativeCurrencies(updatedCurrencies); // Update local state
      addAlternativeCurrency(enrichedCurrency);    // Persist to context  
      //refreshRates(true); // force refresh with true
    }
  };

  const deleteAlternativeCurrency = (code: string) => {
    const updatedCurrencies = alternativeCurrencies.filter((alt) => alt.code !== code);
    setAlternativeCurrencies(updatedCurrencies); // Update local state
    removeAlternativeCurrency(code); // Persist to context
    //refreshRates(true);
  };


  if (error) return <div>Error loading data: {error}</div>;
  if (jsonCurrencies.length === 0) return <div>Loading...</div>;


  
  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal"  ref={contentRef}>
        <section className='centered-container'>
          <h2 className='screen-title'>{t('currency.currency_title')}</h2>
          <IonImg
            src={`assets/images/currency/${color}-currency.svg`} // Dynamically set the SVG source
            alt="Theme image"
            className='screen-narrow-img'
          ></IonImg>
        </section>

        {/* Primary currency */}
        <section>
          <h6 className="section-title">{t('currency.primary_currency')}</h6>
          <p>{t('currency.primary_currency_prompt')}</p>
          <IonItem
            detail={false}
            onClick={() => {
              if (!hasDefaultCurrencyExpense && alternativeCurrencies.length === 0) {
                setIsDefCurrencyModalOpen(true);
              }
            }}
          >
            <IonAvatar slot="start" className="country-avatar">
              <img
                src={getFlagImage(selectedCurrency)}
                alt={selectedCurrency && selectedCurrency.name}
                className="country-flag"
              />
            </IonAvatar>
            <div className='list-item-select'>
              <span>
                {selectedCurrency && selectedCurrency.name && selectedCurrency.symbol
                  ? `${selectedCurrency.name} (${selectedCurrency.symbol})`
                  : 'Make a Selection'}
              </span>
              {!hasDefaultCurrencyExpense && alternativeCurrencies.length === 0 ? (
                <IonIcon aria-hidden="true" icon={caretDownOutline}></IonIcon>
              ) : (
                <IonIcon aria-hidden="true" className='currency-lock-icon' icon={lockClosedOutline}></IonIcon>
              )}
            </div>
          </IonItem>  
        </section>


        {/* Alternative currencies */}
        <section>
          <h6 className="section-title">{t('currency.alternative_currencies')}</h6>
          <p>{t('currency.alternative_currencies_prompt')}</p>

          {alternativeCurrencies.length > 0 ? (
            <>
              {alternativeCurrencies.map((currencyItem) => {
                const isUsed = usedCodes.includes(currencyItem.code);

                return ( 
                <IonItem 
                  key={currencyItem.name}
                  className='country-item'
                >
                  <IonAvatar slot="start" className="country-avatar">
                    <img
                      src={getFlagImage(currencyItem)}
                      alt={currencyItem.name}
                      className="country-flag"
                    />
                  </IonAvatar>

                  <IonLabel className="country-label">
                    <div className='flex'>
                      <IonLabel>
                        {`${currencyItem.name} (${currencyItem.symbol})`}
                      </IonLabel>
                      {currency.travelCurrency?.code === currencyItem.code && (
                        <IonIcon 
                          icon={airplaneOutline} 
                          className='ml-5' 
                          style={{color: 'var(--ion-color-primary)'}} 
                        />
                      )}
                    </div>
                    <IonNote>
                      <ExchangeRateDisplay targetCurrency={currencyItem.code} showLastUpdated={false} />
                    </IonNote>
                  </IonLabel>

                  <IonIcon 
                    slot="end"
                    aria-hidden="true" 
                    icon={trashOutline} 
                    style={{ color: isUsed ? 'var(--ion-color-note)' : 'var(--ion-color-danger)' }}
                    className='delete-currency-icon'
                    onClick={() => {
                      if (!isUsed) {
                        deleteAlternativeCurrency(currencyItem.code);
                      }
                    }}
                  />
                </IonItem>
              )})}
            {/* Call ExchangeRateDisplay with USD because it will only show last updated date */}
            <ExchangeRateDisplay targetCurrency="USD" showExchangeRate={false} showLastUpdated />            
          </>
          ) : (
            <p>{t('currency.no_alt_curr_selected')}</p>
          )}

          <IonButton 
            expand="block" 
            disabled={!actualCurrency?.code} // Disable if actualCurrency.code doesn't exist
            className='mt-20'
            onClick={() => setIsAltCurrencyModalOpen(true)}
          >
            {t('currency.add_curr')}
          </IonButton>
        </section>

        {/* modal for new default currency selection */}
        <IonModal isOpen={isDefCurrencyModalOpen}>
          <IonHeader className="page-header ion-no-border">
            <IonToolbar>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsDefCurrencyModalOpen(false)}>
                  <IonIcon aria-hidden="true" icon={closeOutline} className='close-modal'></IonIcon>
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding-horizontal">
            <div className="header-text-container">
              <h1>{t('currency.select_currency')}</h1>
              <p className="subtitle-text">
                {t('currency.search_currency_text')}
              </p>
            </div>

            <IonSearchbar
              value={currencySearch}
              debounce={200}
              placeholder={t('currency.search_currency')}
              onIonInput={(e) => setCurrencySearch(e.detail.value ?? '')}
              searchIcon={searchOutline}
              showClearButton="never"
              className='custom'
            />

            {filteredCurrencies.map((currencyItem, index) => (
              <IonItem
                className='item-transparent'
                  key={index}
                  button
                  disabled={currency.defaultCurrency.code === currencyItem.code}
                  onClick={() => {
                    handleCurrencyChange(currencyItem);
                    setCurrencySearch('');
                    setIsDefCurrencyModalOpen(false);
                  }}
                >
                  <IonAvatar slot="start" className="country-avatar">
                  <img
                    src={getFlagImage(currencyItem)}
                    alt={currencyItem.name}
                    className="country-flag"
                  />
                </IonAvatar>
              
                <IonLabel>
                  <h2>{currencyItem.name}</h2>
                  <p>
                    {currencyItem.code} ({currencyItem.symbol})
                  </p>
                </IonLabel>
              </IonItem>
            ))}
          </IonContent>
        </IonModal>


        {/* modal for alternative currency selection */}
        <IonModal isOpen={isAltCurrencyModalOpen}>
          <IonHeader className="page-header ion-no-border">
            <IonToolbar>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsAltCurrencyModalOpen(false)}>
                  <IonIcon aria-hidden="true" icon={closeOutline} className='close-modal'></IonIcon>
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding-horizontal">
            <div className="header-text-container">
              <h1>{t('currency.select_alternative_currency')}</h1>
              <p className="subtitle-text">
                {t('currency.search_currency_text')}
              </p>
            </div>

            <IonSearchbar
              value={currencySearch}
              debounce={200}
              placeholder={t('currency.search_currency')}
              onIonInput={(e) => setCurrencySearch(e.detail.value ?? '')}
              searchIcon={searchOutline}
              showClearButton="never"
              className='custom'
            />

            {filteredCurrencies.map((currencyItem) => (
              <IonItem
                className="item-transparent"
                key={currencyItem.code}
                disabled={allSelectedCurrencies.some(c => c.code === currencyItem.code)}
                onClick={() => {
                  newAlternativeCurrency(currencyItem);
                  setCurrencySearch('');
                  setIsAltCurrencyModalOpen(false);
                }}
              >
                <IonAvatar slot="start" className="country-avatar">
                  <img
                    src={getFlagImage(currencyItem)}
                    alt={currencyItem.name}
                    className="country-flag"
                  />
                </IonAvatar>
              
                <IonLabel>
                  <h2>{currencyItem.name}</h2>
                  <p>
                    {currencyItem.code} ({currencyItem.symbol})
                  </p>
                </IonLabel>
              </IonItem>
            ))}
          </IonContent>        
        </IonModal>

      </IonContent>
    </IonPage>
  );
};

export default Currency;