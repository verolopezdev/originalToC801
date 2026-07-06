import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';

import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';


// Context
import { useCurrency } from '../context/CurrencyContext';
import { useUser } from '../context/UserContext'; 

// Ionic's components
import { 
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonIcon,
  IonItem,
  IonModal,
  IonPage, 
  IonTitle,
  IonToolbar 
} from '@ionic/react';


// Ion icons
import { 
  caretDownOutline,
  closeOutline,
} from 'ionicons/icons';


// Styles
import '../Main.css';
import './CountrySelectionPage.css';


interface CountryData {
  name: string;
  code: string;
  locale: string;
  symbol: string;
  country: string;
  thousandSeparator: string;
  decimalSeparator: string;
}

// Main function
const CountrySelectionPage: React.FC = () => {
  const { t } = useTranslation();
  
  const { updateUser } = useUser(); 
  const { setDefaultCurrency, updateActualCurrency } = useCurrency(); 
  const history = useHistory();

  const [isDefCountryModalOpen, setIsDefCountryModalOpen] = useState(false);  
  const [country, setCountry] = useState<CountryData | null>(null);
  const [jsonCountries, setJsonCountries] = useState<CountryData[]>([]);
  const supportedLngs = ['en', 'es', 'fr', 'pt'];

  
  // Load country list from json
  useEffect(() => {
    fetch("/assets/countries.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(t('currency.failed_to_fetch_currency'));
        }
        return response.json();
      })
      .then((data: CountryData[]) => {
        setJsonCountries(data);
      })
      .catch((err) => {
        console.log(err.message);
      });
  }, []);

  // Detect device locale
  useEffect(() => {
    if (jsonCountries.length === 0) return;
  
    const detectDeviceLanguage = async () => {
      // Prevent overriding existing user selection
      const { value: savedCountry } = await Preferences.get({
        key: 'selectedCountry',
      });
  
      if (savedCountry) return;
  
      // Detect device locale
      const { value: deviceLocale } = await Device.getLanguageTag();
      // Examples:
      // "es-AR"
      // "en-US"
      // "pt-BR"
  
      // Try exact locale match
      let matchedCountry = jsonCountries.find(
        c => c.locale.toLowerCase() === deviceLocale.toLowerCase()
      );
  
      // Fallback to language only
      if (!matchedCountry) {
        const langOnly = deviceLocale.split('-')[0];
  
        matchedCountry = jsonCountries.find(
          c => c.locale.startsWith(langOnly)
        );
      }
  
      // Final fallback
      if (!matchedCountry) {
        matchedCountry = jsonCountries[0];
      }
  
      if (matchedCountry) {
        setCountry(matchedCountry);
  
        // Also set app language immediately
        const userLang = matchedCountry.locale.split('-')[0];
  
        const langToUse = supportedLngs.includes(userLang)
          ? userLang
          : 'en';
  
        await i18n.changeLanguage(langToUse);
        await Preferences.set({
          key: 'i18nextLng',
          value: langToUse,
        });
      }
    };
  
    detectDeviceLanguage();
  }, [jsonCountries]);

  if (jsonCountries.length === 0) return <div>{t('common.loading')}</div>;


  // handleContinue applies changes and redirects to dashboard
  const handleContinue = async () => {
    if (!country) return; // Make sure a country is selected
    
    // Set default language
    const userLang = country.locale.split('-')[0]; // Extract "es" from "es-AR"
    
    const langToUse = supportedLngs.includes(userLang) ? userLang : 'en';

    await i18n.changeLanguage(langToUse);
    await Preferences.set({ key: 'i18nextLng', value: langToUse });

    // thousands and decimals separators
    const numberFormat = new Intl.NumberFormat(country.locale);
    const exampleFormatted = numberFormat.format(1234567.89);

    country.thousandSeparator = exampleFormatted.replace(/\d/g, '').charAt(0);
    country.decimalSeparator = (1.1).toLocaleString(country.locale).substring(1, 2);
    
    // Set default currency
    setDefaultCurrency(country);
    updateActualCurrency(country); 

    // Store the selected country so this screen doesn't show again
    await Preferences.set({ key: 'selectedCountry', value: country.country });

    // Redirect to the Dashboard
    history.replace('/dashboard');
  };



  return (
    <IonPage>
      <IonContent className="ion-padding-horizontal">
        <div className="country-screen">
          {/* Logo and app name */}
          <div className="centered-container">
            <img
              src="/assets/images/logo.png"
              alt="App logo"
              className="big-logo"
            />
            <h1 className='app-name'>AppName</h1>
            <h4 className='app-type'>Expense Tracker</h4>
          </div>

          {/* Screen headers */}
          <h1 className='big-header'>{t('country_selection.big_heading')}</h1>
          <h5 className='country-header-prompt'>{t('country_selection.subheading')}</h5>

          {/* Select country */}
          <IonItem className='country-select' button onClick={() => setIsDefCountryModalOpen(true)}>
            <div className='list-item-select'>
              <span>
                {country ? country.country : t('country_selection.select_country')}
              </span>
              <IonIcon aria-hidden="true" icon={caretDownOutline}></IonIcon>
            </div>
          </IonItem> 

          {/* Redirect button */}
          <IonButton expand="block" onClick={handleContinue} disabled={!country}>
            {t('common.continue')}
          </IonButton>
        </div>

        {/* Modal for full screen country selection */}
        <IonModal isOpen={isDefCountryModalOpen}>
          <IonHeader className="ion-no-border">
            <IonToolbar>
              <IonTitle>{t('country_selection.select_country')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsDefCountryModalOpen(false)}>
                  <IonIcon aria-hidden="true" icon={closeOutline} className='close-modal'></IonIcon>
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            {jsonCountries.map((countryItem, index) => (
              <IonItem
                className='item-transparent'
                  key={index}
                  button
                  onClick={() => {
                    setCountry(countryItem);
                    setIsDefCountryModalOpen(false);
                  }}
                >
                  {countryItem.country}
              </IonItem>
            ))}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default CountrySelectionPage;
