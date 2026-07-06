import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useNumericKeypad } from '../context/NumericKeypadContext';

import {
  IonItem, 
  IonSelect, 
  IonSelectOption, 
  IonRadioGroup, 
  IonRadio, 
  IonButton, 
  IonToggle
} from '@ionic/react';

import { RecurrenceSettings } from '../hooks/useRecurringExpense';
import { useDatePicker } from '../context/DatePickerContext';

import '../Main.css';

interface FrecuencyFormProps {
  startDate: string;
  onDone: (series: RecurrenceSettings) => void;
  initialSettings: RecurrenceSettings;
  editRecurrence?: boolean;
}


const FrequencyForm: React.FC<FrecuencyFormProps> = ({ startDate, onDone, initialSettings, editRecurrence }) => {  
  const { t } = useTranslation();
  const [interval, setInterval] = useState<string>('1');
  const [unit, setUnit] = useState<'week' | 'month' | 'year'>('month');
  const [endCondition, setEndCondition] = useState<'never' | 'afterOccurrences' | 'onDate' >('never');
  const [endDate, setEndDate] = useState<string>('');
  const [totalOccurrences, setTotalOccurrences] = useState<string>('1');
  const [logAutomatically, setLogAutomatically] = useState(false);
  const { openKeypad } = useNumericKeypad();
  const { openDatePicker } = useDatePicker();
  const [amountVaries, setAmountVaries] = useState(false);


  useEffect(() => {
    if (initialSettings?.isRecurring) {
      setAmountVaries(initialSettings.amountVaries ?? false);
      setInterval(String(initialSettings.interval ?? '1'));
      setUnit(initialSettings.unit ?? 'month');
      setEndCondition(initialSettings.endCondition ?? 'never');
      setTotalOccurrences(
        initialSettings.totalOccurrences != null
          ? String(initialSettings.totalOccurrences)
          : '1'
      );
      setEndDate(initialSettings.endDate ?? '');
      setLogAutomatically(initialSettings.logAutomatically ?? false);
    }
  }, []);

  const minSelectableDate = initialSettings.lastLoggedDate && editRecurrence
  ? new Date(initialSettings.lastLoggedDate)
  : new Date(startDate);


  const handleSubmit = () => {
    const parsedInterval = parseInt(interval || '1', 10);
    const parsedOccurrences =
      endCondition === 'afterOccurrences'
        ? parseInt(totalOccurrences || '1', 10)
        : null;
  
    const settings: RecurrenceSettings = {
      isRecurring: 1,
      unit,
      interval: parsedInterval,
      endCondition: endCondition === 'onDate'
        ? 'onDate'
        : endCondition === 'afterOccurrences'
          ? 'afterOccurrences'
          : 'never',
      totalOccurrences: parsedOccurrences,
      endDate: endCondition === 'onDate' ? endDate : null,
      logAutomatically,
      lastLoggedDate: initialSettings.lastLoggedDate,
      lastLoggedInstallmentIndex: initialSettings.lastLoggedInstallmentIndex,
      amountVaries,
    };
  
    onDone(settings); // 👈 Send clean recurrence settings
  };

  const handleClear = () => {
    setInterval('');
    setUnit('month');
    setEndCondition('never');
    setTotalOccurrences('');
    setEndDate('');
    setAmountVaries(false),

    // Inform parent: recurrence is disabled
    onDone({
      isRecurring: 0,
      unit: 'month',
      interval: 1,
      endCondition: 'never',
      totalOccurrences: null,
      endDate: null,
      logAutomatically: false, 
      lastLoggedDate: '',
      lastLoggedInstallmentIndex: 0
    });
  };


  return (
    <>
      {/* Repeat every */}
      <div className={`repeat-row mb-20 ${editRecurrence ? 'placeholder' : ''}`}>
        <span className="repeat-label">{t('expenses.config_every')}</span>
        <input
          type="text"
          value={interval}
          readOnly
          onClick={() => {
            openKeypad({
              initialValue: interval,
              dotDisabled: true,  
              decimalSeparator: '',
              maxDigits: 2,
              onInputChange: setInterval, // 👈 live update!
            }).then(setInterval); // optional: ensure final value is consistent
          }}
          className={`repeat-input ${editRecurrence ? 'disabled' : ''}`}           
          disabled={!!editRecurrence}
        />

        <IonItem>
          <IonSelect 
            value={unit} 
            onIonChange={e => setUnit(e.detail.value)} 
            interface="popover"
            disabled={!!editRecurrence}
          >
            <IonSelectOption value="week">
              {t("date.weeks")}
            </IonSelectOption>

            <IonSelectOption value="month">
              {t("date.months")}
            </IonSelectOption>

            <IonSelectOption value="year">
              {t("date.years")}
            </IonSelectOption>
          </IonSelect>
        </IonItem>
      </div>

      {/* Expense ends */}
      <p className={`mt-30 ${editRecurrence ? 'placeholder' : ''}`}>{t('common.ends')}</p>  

      <IonRadioGroup value={endCondition} onIonChange={e => setEndCondition(e.detail.value)} className='frecuency-radio-group'>
        {/* Never */}
        <IonRadio 
          value="never" 
          labelPlacement="end" 
          className={`${endCondition!=='never' ? 'placeholder' : ''}`}
          disabled={editRecurrence && endCondition==='afterOccurrences'}
        >
          {t('common.never')}
        </IonRadio>

        {/* On date */}
        <div 
          className={`radio-with-input ${endCondition!=='onDate' ? 'placeholder' : ''}`}
          onClick={async () => {
            if (editRecurrence && endCondition==='afterOccurrences') return; // ⬅ block action

            setEndCondition('onDate');
            const picked = await openDatePicker(  
              endDate ? new Date(endDate) : new Date(),
              {minDate: minSelectableDate} // ⬅ disables all previous dates
            );
            if (typeof picked === 'string') {
              setEndDate(picked);
            }
          }}
        >
          <IonRadio 
            value="onDate" 
            labelPlacement="end" 
            disabled={editRecurrence && endCondition==='afterOccurrences'}
          >
            {t('common.on_date_end')}
          </IonRadio>
          <div
            className={`repeat-row ${endCondition !== 'onDate' ? 'disabled' : ''}`}
            id="bottom-start"
          >            
            <span className={`repeat-input date ${endCondition!=='onDate' ? 'placeholder' : ''}`}>
              {endDate
                ? new Date(endDate).toLocaleDateString()
                : new Date().toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* After certain number of payments */}
        <div className={`radio-with-input ${endCondition!=='afterOccurrences' ? 'placeholder' : ''}`}>
          <IonRadio 
            value="afterOccurrences" 
            labelPlacement="end"
            disabled={editRecurrence}
          >
            {t('common.after')}
          </IonRadio>
          <div className={`repeat-row ${editRecurrence ? 'placeholder' : ''}`}>
            <input
              type="text"
              readOnly
              value={totalOccurrences}
              onClick={() => {
                setEndCondition('afterOccurrences'); // 👈 still sets the selected radio
                openKeypad({
                  initialValue: totalOccurrences,
                  decimalSeparator: '', // not used, but required
                  dotDisabled: true,     // disable decimal
                  maxDigits: 2,
                  onInputChange: setTotalOccurrences // live update!
                }).then(setTotalOccurrences); // optional final cleanup
                setAmountVaries(false);
              }}
              className={`repeat-input ${editRecurrence ? 'placeholder' : ''}`}
              disabled={editRecurrence}
            />    
            <span className="repeat-label">{t('common.payments')}</span>
          </div>
        </div>
      </IonRadioGroup>

      {/* Variable amount toggle */}
      <div 
        className={`mt-30 toggle-row ${amountVaries ? 'active' : ''}`}
      >
        <IonToggle
          checked={amountVaries}
          onIonChange={(e) => { 
            // 👇 Only allow change if neither disabling condition is met
            if (endCondition !== 'afterOccurrences' && !editRecurrence) {  
              setAmountVaries(e.detail.checked);
            }
          }}
          // 👇 Disable if 'afterOccurrences' OR if 'editRecurrence' is true
          disabled={endCondition === 'afterOccurrences' || editRecurrence}
        />
        <span 
          // 👇 Apply 'disabled' class if 'afterOccurrences' OR if 'editRecurrence' is true
          className={endCondition === 'afterOccurrences' || editRecurrence ? 'disabled' : ''}
          onClick={() => { 
            // 👇 Only allow click/toggle if neither disabling condition is met
            if (endCondition !== 'afterOccurrences' && !editRecurrence) {  
              setAmountVaries(!amountVaries); // Toggle when text is clicked
            }
          }}
        >
          {t('expenses.amount_varies')}
        </span>
      </div>

      {/* Button */}
      <div className="modal-btns">     
        <IonButton
          onClick={handleClear} // ← pass undefined to parent
          fill="outline"
          className="small-btn-fill mt-40"
          disabled={!!editRecurrence}
        >
          {t('common.clear')}
        </IonButton>
           
        <IonButton 
          onClick={handleSubmit} 
          className='small-btn mt-40' 
          color="primary"
          disabled={
            !interval || 
            Number(interval) <= 0 ||
            (endCondition === 'afterOccurrences' && Number(totalOccurrences) <= 0)
          }
        >
          {t('common.done')}
        </IonButton>
      </div>

    </>
  );
};

export default FrequencyForm;
