import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { IonSelectOption } from "@ionic/react";

interface CurrencyData {
  currencyName: string;
  currencyCode: string;
  symbol: string;
}

const CurrencySelect: React.FC = () => {
  const { t } = useTranslation();

  const [currencies, setCurrencies] = useState<CurrencyData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Replace with the correct path to your JSON file
    fetch("/assets/currency-codes.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch currency data");
        }
        return response.json();
      })
      .then((data: CurrencyData[]) => {
        setCurrencies(data);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  if (error) {
    return <div>{t("common.error_loading_data", { error })}</div>;
  }

  if (currencies.length === 0) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    // returns a list of IonSelectOption
    // insert into IonSelect component
    
    <>
      {currencies.map((currency, index) => (
        <IonSelectOption
          key={index}
          value={currency.currencyCode}
        >
          {`${currency.currencyName} (${currency.symbol})`}
        </IonSelectOption>
      ))}
    </>
  );
};

export default CurrencySelect;
