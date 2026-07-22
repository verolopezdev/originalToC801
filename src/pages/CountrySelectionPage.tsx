import React, { useEffect, useState, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';

// Context
import { useCurrency } from '../context/CurrencyContext';

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';

// Ionic components
import { 
  IonAvatar,
  IonBackButton,
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonItem,
  IonLabel,
  IonPage, 
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonToolbar 
} from '@ionic/react';

// Ion icons
import { searchOutline } from 'ionicons/icons';

// Styles
import '../Main.css';
import './CountrySelectionPage.css';

interface CountryData {
  name: string;
  code: string;
  locale: string;
  symbol: string;
  country: string;
  nativeName?: string;
  thousandSeparator: string;
  decimalSeparator: string;
  flag?: string;
}


const CountrySelectionPage: React.FC = () => {
  const { t } = useTranslation();
  const contentRef = useScrollToTop();

  const { setDefaultCurrency, updateActualCurrency } = useCurrency(); 
  const history = useHistory();

  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [jsonCountries, setJsonCountries] = useState<CountryData[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const supportedLngs = ['en', 'es', 'fr', 'pt'];

  const selectedItemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const content = contentRef.current;
    const selectedEl = selectedItemRef.current;
  
    if (!selectedCountry || !selectedEl || !content) return;
  
    const scroll = async () => {
      const scrollEl = await content.getScrollElement();
  
      const itemRect = selectedEl.getBoundingClientRect();
      const scrollRect = scrollEl.getBoundingClientRect();
  
      const y =
        scrollEl.scrollTop +
        itemRect.top -
        scrollRect.top -
        scrollRect.height / 2 +
        itemRect.height / 2;
  
      content.scrollToPoint(0, y, 400);
    };
  
    const timer = setTimeout(scroll, 100);
  
    return () => clearTimeout(timer);
  }, [selectedCountry]);


  // 1. Fetch countries safely
  useEffect(() => {
    fetch("/assets/countries.json")
      .then((response) => response.json())
      .then((data: CountryData[]) => {
        setJsonCountries(data);
      })
      .catch((err) => console.error("Error loading countries:", err));
  }, []);

  // 2. Detect device locale
  useEffect(() => {
    if (jsonCountries.length === 0) return;

    const detectDeviceLanguage = async () => {
      const { value: savedCountry } = await Preferences.get({ key: 'selectedCountry' });
      if (savedCountry) return;

      const { value: deviceLocale } = await Device.getLanguageTag();
      
      let matched = jsonCountries.find(
        c => c.locale.toLowerCase() === (deviceLocale || '').toLowerCase()
      );

      if (!matched) {
        const langOnly = (deviceLocale || '').split('-')[0];
        matched = jsonCountries.find(c => c.locale.startsWith(langOnly));
      }

      if (!matched) matched = jsonCountries[0];

      if (matched) {
        setSelectedCountry(matched);
        const userLang = matched.locale.split('-')[0];
        const langToUse = supportedLngs.includes(userLang) ? userLang : 'en';
        await i18n.changeLanguage(langToUse);
      }
    };

    detectDeviceLanguage();
  }, [jsonCountries]);


  // 3. Strict prefix search filter
  const cleanSearchQuery = searchText.trim().toLowerCase();

  const filteredCountries = jsonCountries.filter((item) => {
    // Empty search query -> Return all items
    if (!cleanSearchQuery) return true;

    const countryName = item.country ? item.country.toLowerCase() : '';
    const nativeName = item.nativeName ? item.nativeName.toLowerCase() : '';

    // Checks if the country or native name starts with the typed query
    const matchesCountry = countryName.startsWith(cleanSearchQuery);
    const matchesNative = nativeName.startsWith(cleanSearchQuery);

    return matchesCountry || matchesNative;
  });

  // 4. Immutable handleContinue (Prevents mutating state objects)
  const handleContinue = async () => {
    if (!selectedCountry) return;

    // Create a fresh clone so we don't mutate state objects directly
    const countryToSave = { ...selectedCountry };

    const userLang = countryToSave.locale.split('-')[0];
    const langToUse = supportedLngs.includes(userLang) ? userLang : 'en';

    await i18n.changeLanguage(langToUse);
    await Preferences.set({ key: 'i18nextLng', value: langToUse });

    const numberFormat = new Intl.NumberFormat(countryToSave.locale);
    const exampleFormatted = numberFormat.format(1234567.89);

    countryToSave.thousandSeparator = exampleFormatted.replace(/\d/g, '').charAt(0);
    countryToSave.decimalSeparator = (1.1).toLocaleString(countryToSave.locale).substring(1, 2);

    setDefaultCurrency(countryToSave);
    updateActualCurrency(countryToSave);

    await Preferences.set({ key: 'selectedCountry', value: countryToSave.country });
    history.replace('/app/dashboard');
  };

  if (jsonCountries.length === 0) {
    return <div className="loading-state">{t('common.loading')}</div>;
  }

  return (
    <IonPage className="country-page">
      <IonHeader className="page-header ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/welcome" />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal" ref={contentRef}>
        <div className="header-text-container">
          <h1>{t('country_selection.select_country')}</h1>
          <p className="subtitle-text">
            {t('country_selection.select_country_text')}
          </p>
        </div>

        {/* Controlled Searchbar */}
        <div className="search-wrapper">
          <IonSearchbar
            value={searchText}
            onIonInput={(e) => setSearchText(e.detail.value ?? '')}
            showClearButton="never"
            placeholder={t('country_selection.search_country')}
            searchIcon={searchOutline}
            className='custom mb-20'
            debounce={0}
          />
        </div>

        {/* List of Countries */}
        <IonRadioGroup
          value={selectedCountry?.country}
          onIonChange={(e) => {
            const chosen = jsonCountries.find(
              c => c.country === e.detail.value
            );
            if (chosen) {
              setSelectedCountry(chosen);
            }
          }}
        >
          {filteredCountries.map((countryItem) => {
            const isSelected = selectedCountry?.country === countryItem.country;
            return (
              <div
                key={countryItem.country}
                ref={(el) => {
                  if (isSelected) {
                    selectedItemRef.current = el;
                  }
                }}
              >
                <IonItem
                  lines="none"
                  className={`country-item ${isSelected ? 'country-item-selected' : ''}`}
                  onClick={() => setSelectedCountry(countryItem)}
                >
                  <IonAvatar slot="start" className="country-avatar">
                    <img
                      src={`/assets/flags/${countryItem.locale.split('-')[1].toLowerCase()}.svg`}
                      alt={countryItem.country}
                      className="country-flag"
                    />
                  </IonAvatar>

                  <IonLabel className="country-label">
                    <div className="country-main-name">{countryItem.country}</div>
                    {countryItem.nativeName && countryItem.nativeName !== countryItem.country && (
                      <div className="country-native-subtext">{countryItem.nativeName}</div>
                    )}
                  </IonLabel>

                  <IonRadio
                    slot="end"
                    value={countryItem.country}
                    aria-label={countryItem.country}
                  />
                </IonItem>
              </div>
            );
          })}
        </IonRadioGroup>
      </IonContent>

      <div className="fixed-footer-button">
        <IonButton
          expand="block"
          onClick={handleContinue}
          disabled={!selectedCountry}
          className="continue-btn"
        >
          {t('common.continue')}
        </IonButton>
      </div>
    </IonPage>
  );
};

export default CountrySelectionPage;