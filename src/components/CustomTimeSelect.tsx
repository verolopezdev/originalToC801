import React from 'react';
import { IonItem, IonSelect, IonSelectOption } from '@ionic/react';

interface CustomTimeSelectProps {
  label?: string;
  value: string; // "HH:mm"
  onChange: (value: string) => void;
}

const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute of [0, 30]) {
      const hh = String(hour).padStart(2, '0');
      const mm = String(minute).padStart(2, '0');
      options.push(`${hh}:${mm}`);
    }
  }
  return options;
};
  
const CustomTimeSelect: React.FC<CustomTimeSelectProps> = ({ label = 'Time', value, onChange }) => {
  const timeOptions = generateTimeOptions();

  return (
    <IonItem>
      <IonSelect 
				value={value || undefined} 
				onIonChange={(e) => onChange(e.detail.value)} 
				interface="popover"
			>
        {timeOptions.map((t) => (
          <IonSelectOption key={t} value={t}>
            {t}
          </IonSelectOption>
        ))}
      </IonSelect>
    </IonItem>
  );
};

export default CustomTimeSelect;
