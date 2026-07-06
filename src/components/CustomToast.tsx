import React from 'react';
import { useTranslation } from 'react-i18next';

import { IonToast } from '@ionic/react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface CustomToastProps {
  message: string;
  isOpen: boolean;
  onDismiss: () => void;
  type?: ToastType;
  icon?: string; // optional override
  duration?: number;
  position?: 'top' | 'middle' | 'bottom';
  buttons?: { text: string; role: string }[];
  className?: string;
}


const typeSettings: Record<ToastType, { icon: string; color: string }> = {
  success: { icon: 'checkmark-circle-outline', color: 'success' },
  error: { icon: 'close-circle-outline', color: 'danger' },
  info: { icon: 'information-circle-outline', color: 'primary' },
  warning: { icon: 'warning-outline', color: 'warning' },
};


const typeDurations: Record<ToastType, number> = {
  success: 3000,
  error: 6000,
  info: 3000,
  warning: 3000,
};


const CustomToast: React.FC<CustomToastProps> = ({
  message,
  isOpen,
  onDismiss,
  type,
  icon,
  duration,
  position = 'bottom',
  buttons,
  className = 'custom-toast',
}) => {
  const { t } = useTranslation();
  const toastButtons =
    buttons ?? [{ text: t('common.dismiss'), role: 'cancel' }];
  
  const iconToUse = icon || (type ? typeSettings[type].icon : undefined);
  const colorToUse = type ? typeSettings[type].color : undefined;
  const finalDuration =   duration ?? (type ? typeDurations[type] : 2000); // default fallback

  return (
    <IonToast
      isOpen={isOpen}
      message={message}      
      duration={finalDuration}
      icon={iconToUse}
      color={colorToUse}
      position={position}
      className={className}
      buttons={toastButtons}
      onDidDismiss={onDismiss}
    />
  );
};

export default CustomToast;
