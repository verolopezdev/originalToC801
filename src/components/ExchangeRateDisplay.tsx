import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Custom hooks
import { CurrencyType, useCurrency } from '../context/CurrencyContext';
import { useExchangeRates } from '../context/ExchangeRateContext';

// App components
import FormatAmount from './FormatAmount';
import FormattedDate from './FormattedDate';

// Ionic components
import { IonIcon, IonNote } from '@ionic/react';
import { ellipse } from 'ionicons/icons';

type Props = {
  targetCurrency: string; // e.g., 'USD', 'EUR'
  showExchangeRate?: boolean; // optional, defaults to true
  showLastUpdated?: boolean;  // optional, defaults to false
};

const ExchangeRateDisplay: React.FC<Props> = ({ 
  targetCurrency,
  showExchangeRate = true,
  showLastUpdated = false, 
}) => {
  const { t } = useTranslation();
  
  const { allSelectedCurrencies } = useCurrency();
  const { exchangeRates, lastUpdated, outdated } = useExchangeRates();

  const [defaultCurr, setDefaultCurr] = useState<CurrencyType>();
  const [targetCurr, setTargetCurr] = useState<CurrencyType>();
    
  useEffect(() => {
    if (!exchangeRates || !allSelectedCurrencies) return;

    const { baseCurrency } = exchangeRates;

    const baseCurrencyData = allSelectedCurrencies.find(
      (c) => c.code === baseCurrency
    );
    const targetCurrencyData = allSelectedCurrencies.find(
      (c) => c.code === targetCurrency
    );

    if (baseCurrencyData) setDefaultCurr(baseCurrencyData);
    if (targetCurrencyData) setTargetCurr(targetCurrencyData);
  }, [showExchangeRate, exchangeRates, allSelectedCurrencies, targetCurrency]);


  if (!showExchangeRate && showLastUpdated && lastUpdated) {
    return (
      <IonNote className='mt-10'>
        <IonIcon
          className={`led-icon mr-5 ${outdated ? 'danger' : 'success'}`}
          icon={ellipse}
        />
        {t('currency.exchange_rates_last_updated')}
        <FormattedDate date={lastUpdated} format="dateTimeShort" />
      </IonNote>
    );
  }


  if (!exchangeRates) return <p>{t('currency.no_exchange_rate_data')}</p>;

  const { currencies } = exchangeRates;
  const rate = currencies[targetCurrency];

  if (!rate) return <p>{t('currency.no_rate_for', { targetCurrency })}</p>;
  if (!defaultCurr || !targetCurr) return null;


  return (
    <div>
      {showExchangeRate && (
        rate < 1 ? ( // Invert position when rate is lower than 1
          <>
            <FormatAmount currencyCode={targetCurr.code} amount={1} /> ={' '}
            <FormatAmount currencyCode={defaultCurr.code} amount={1 / rate} rate={true} />
          </>
        ) : (
          <>
            <FormatAmount currencyCode={defaultCurr.code} amount={1} /> ={' '}
            <FormatAmount currencyCode={targetCurr.code} amount={rate} rate={true} />
          </>
        )
      )}
  
      {showLastUpdated && lastUpdated && (
        <div className='flex-top'>
          <IonIcon
            className={`led-icon mr-5 ${outdated ? 'danger' : 'success'}`}
            icon={ellipse}
          />
          <IonNote>
            {t('currency.exchange_rates_last_updated')}
            <FormattedDate date={lastUpdated} format="dateTimeShort" />
          </IonNote>
        </div>
      )}
    </div>
  );
  
};

export default ExchangeRateDisplay;
