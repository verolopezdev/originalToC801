import React from 'react';
import { IonModal } from '@ionic/react';
import { useTranslation } from 'react-i18next';


interface DeleteScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (scope: 'this' | 'future' | 'all' | undefined) => void;
  endCondition: 'never' | 'onDate' | 'afterOccurrences'; // Add this prop
}

const DeleteScopeModal: React.FC<DeleteScopeModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  endCondition
}) => {
  const { t } = useTranslation();
  
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="small-modal">
      <div className="small-modal-content">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h4 style={{ color: 'var(--ion-color-danger)' }}>{t('modal.attention')}</h4>
          <h6 style={{ color: 'var(--ion-color-danger)' }}>{t('modal.delete_warning')}</h6>
          <p>{t('modal.delete_msg')}</p>
        </div>

        {/* Only this */}
        <div className='small-modal-btn' onClick={() => { onSelect('this'); onClose(); }}>
          {t('modal.option_current_exp')}
        </div>

        {/* This and future (conditionally displayed) */}
        {endCondition !== 'afterOccurrences' && (
          <div className='small-modal-btn' onClick={() => { onSelect('future'); onClose(); }}>
            {t('modal.option_current_future')}
          </div>
        )}

        {/* All */}
        <div
          className='small-modal-btn'
          
          onClick={() => { onSelect('all'); onClose(); }}
        >
          {t('modal.option_all_series_exp')}
        </div>

        {/* Cancel */}
        <div className='small-modal-btn' onClick={() => { onSelect(undefined); onClose(); }} style={{ color: 'var(--ion-color-danger)' }}>
          {t('common.cancel')}
        </div>
      </div>
    </IonModal>
  );
};

export default DeleteScopeModal;
