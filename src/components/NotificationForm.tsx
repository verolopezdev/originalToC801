import React, { useEffect, useState } from 'react';
import CustomTimeSelect from './CustomTimeSelect';
import { useNumericKeypad } from '../context/NumericKeypadContext';

import {
  IonItem,
  IonSelect,
  IonSelectOption,
  IonButton
} from '@ionic/react';

export interface NotificationData {
  amount: string;
  unit: 'day' | 'week';
  time: string; // "HH:mm" format
}

interface NotificationFormProps {
  initialValue?: NotificationData;
  onSave: (data: NotificationData | undefined) => void;
  onCancel?: () => void;
}

const NotificationForm: React.FC<NotificationFormProps> = ({ initialValue, onSave, onCancel }) => {
	const { openKeypad } = useNumericKeypad();
	
  const [amount, setAmount] = useState<string>(initialValue?.amount ?? '1');
  const [unit, setUnit] = useState<'day' | 'week'>(initialValue?.unit ?? 'day');
  const [time, setTime] = useState<string>(initialValue?.time ?? '09:00');

	useEffect(() => {
		if(initialValue?.amount) {
			setAmount(initialValue.amount);
			setUnit(initialValue.unit);
			setTime(initialValue.time);
		}
	}, [initialValue]);

  const handleSave = () => {
    onSave({ amount, unit, time });
  };
	

  return (
    <div>
			<div className='centered-container'>
				{/* days/weeks before */}
				<div className='repeat-row mb-20'>
					<input
						type="text"
						value={amount}
						readOnly
						onClick={() => {
							openKeypad({
								initialValue: amount,
								dotDisabled: true,
								decimalSeparator: '',
								maxDigits: 2,
								onInputChange: setAmount, // 👈 live update!
							}).then(setAmount); // optional: ensure final value is consistent
						}}
						className='repeat-input'
					/>

					<IonItem>
						<IonSelect 
							value={unit} 
							onIonChange={e => setUnit(e.detail.value)} 
							interface="popover"
						>
							<IonSelectOption value="day">day(s)</IonSelectOption>
							<IonSelectOption value="week">week(s)</IonSelectOption>
						</IonSelect>
					</IonItem>
					<span className="repeat-label">before</span>

				</div>
        
				{/* time */}
				<div className='repeat-row'>
					<span className="repeat-label">at</span>
					<CustomTimeSelect
						label="Notify at"
						value={time}
						onChange={(val) => setTime(val)}
					/>
				</div>
			</div>

			{/* Buttons */}
			<div className="modal-btns">
			<IonButton
				onClick={() => onSave(undefined)} // ← pass undefined to parent
				 fill="outline"
				className="small-btn mt-40"
				disabled={!time}
			>
				Clear
			</IonButton>
				<IonButton onClick={handleSave} className='small-btn mt-40' disabled={!amount}>
					Done
				</IonButton>
			</div>
			
    </div>
  );
};

export default NotificationForm;
