import React, { useEffect, useState, useRef } from 'react';

import { Share } from '@capacitor/share';
import { db } from '../db';
import { backupDatabase, restoreLatestBackup } from '../services/BackupService';
import { useTranslation } from 'react-i18next';


interface BackupFile {
  name: string;
  size?: number;
  mtime?: number;
}
// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';

// App components
import CustomToast from '../components/CustomToast';
import Footer from '../components/Footer';


// Ionic's components
import { 
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader,
  IonIcon,
  IonNote,
  IonPage,
  IonToolbar,
  useIonAlert,
  useIonViewWillEnter
} from '@ionic/react';

// Styles
import '../Main.css';
import './BackUp.css';



import {
  Directory,
  Filesystem,
  FileInfo,
} from '@capacitor/filesystem';

import { 
  add,
  cashOutline, 
  homeOutline,
  layersOutline,
  alertCircle, 
  checkmarkCircle, 
  cloud, 
  diamond, 
  idCard, 
  server, 
  shareSocialOutline 
} from 'ionicons/icons';

interface BackupFile {
  name: string;
  size?: number;
  mtime?: number;
}

// Footer items
const appPages = [
  {
    title: 'home',
    url: '/dashboard',
    iosIcon: homeOutline,
    mdIcon: homeOutline
  },
  {
    title: 'accounts',
    url: '/accounts',
    iosIcon: layersOutline,
    mdIcon: layersOutline
  },
  {
    title: 'Add',
    url: '/newexpense/0',
    iosIcon: add,
    mdIcon: add
  },
  {
    title: 'activity',
    url: '/activity',
    iosIcon: cashOutline,
    mdIcon: cashOutline
  }
];



const TestPage: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { t } = useTranslation();
  const [presentAlert] = useIonAlert();
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const latestBackup = files[0];

  // Translate footer menu item titles
  const translatedMenuItems = appPages.map((item) => ({
    ...item,
    title: t(`common.${item.title}`, { defaultValue: item.title }),
  }));
  

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastOpen(true);
  };


  const formatSize = (bytes?: number) => {
    if (!bytes) return t('backup.unknown_size');  

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };


  const formatDate = (timestamp?: number) => {
    if (!timestamp) return t('backup.unknown_date');

    return new Date(timestamp).toLocaleString();
  };

  
  /* Load backup files */
  const loadBackups = async () => {
    try {
      const result = await Filesystem.readdir({
        path: 'backups',
        directory: Directory.Data,
      });

      const backupFiles = result.files
        .filter(
          (file: FileInfo) =>
            file.name.startsWith('backup-') &&
            file.name.endsWith('.json')
        )
        .sort((a: FileInfo, b: FileInfo) => {
          const aTime = parseInt(a.name.match(/\d+/)?.[0] || '0');
          const bTime = parseInt(b.name.match(/\d+/)?.[0] || '0');

          return bTime - aTime;
        });

      setFiles(backupFiles);

    } catch (error: any) {

      // Ignore missing backup folder
      if (
        error?.message?.includes('does not exist') ||
        error?.message?.includes('File does not exist')
      ) {
        setFiles([]);
        return;
      }
  
      // Real error
      console.error('Failed to load backups:', error);
      setFiles([]);
  
    }
  };

  
  useIonViewWillEnter(() => {
    console.log('Backup page entered');
    loadBackups();
  });


  /* Share backup file */
  const shareBackup = async (fileName: string) => {
    try {
  
      // 1. Read original backup
      const file = await Filesystem.readFile({
        path: `backups/${fileName}`,
        directory: Directory.Data,
      });
  
      // 2. Write temporary shareable copy
      const tempPath = `shared/${fileName}`;
  
      await Filesystem.writeFile({
        path: tempPath,
        data: file.data,
        directory: Directory.Cache,
        recursive: true,
      });
  
      // 3. Get URI for temp file
      const uriResult = await Filesystem.getUri({
        path: tempPath,
        directory: Directory.Cache,
      });
  
      console.log('Sharing URI:', uriResult.uri);
  
      // 4. Share
      await Share.share({
        title: t('backup.share_title'),
        text: t('backup.share_text'),
        url: uriResult.uri,
        dialogTitle: t('backup.share_dialog_title'),
      });
  
    } catch (error: any) {
      console.error('Failed to share backup:', error);

      // Check if the user cancelled the sharing action intentionally
      const isCancelled = 
        error?.message?.toLowerCase().includes('canceled') || 
        error?.message?.toLowerCase().includes('cancelled') ||
        error?.message?.toLowerCase().includes('dismissed');

      if (isCancelled) {
        console.log('User cancelled the share dialog.');
        return; // Exit early without showing the error toast
      }
      
      // Real error happened
      showToast(t('backup.failed_to_share'), 'error');
    }
  };


  /* Import backup file */
  const handleImportBackup = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
  
    try {
      // Read selected file
      const text = await selectedFile.text();
  
      // Validate JSON format
      const parsedBackup = JSON.parse(text);
  
      // Ask for confirmation before restoring
      const confirmed =
        await confirmRestoreFromLocation();
  
      if (!confirmed) {
        event.target.value = '';
        return;
      }
  
      console.log(
        'Selected backup:',
        selectedFile.name
      );
  
      // Attempt restore
      await restoreLatestBackup(parsedBackup);
  
      showToast(
        t('backup.restored_successfully'),
        'success'
      );
  
      await loadBackups();
  
    } catch (error) {
  
      console.error(
        'Failed to import backup:',
        error
      );
  
      const errorMsg =
        error instanceof Error
          ? error.message
          : 'Unknown error';
  
      showToast(
        errorMsg,
        'error'
      );
  
    } finally {
  
      // Allow selecting the same file again
      event.target.value = '';
  
    }
  };



  /* Create manual backup */
  const createManualBackup = async () => {
    try {
      setIsCreatingBackup(true);
      console.log('Creating manual backup...');
      const fileName = await backupDatabase(db);
      console.log('Manual backup created:', fileName);
  
      // Refresh list after backup
      await loadBackups();
      showToast(t('backup.backup_successfully'), 'success');
  
    } catch (error) {
  
      console.error('Manual backup failed:', error);
      showToast(t('backup.backup_failed'), 'error');
  
    } finally {
  
      setIsCreatingBackup(false);
    }
  };


  // Show a confirmation dialog before restoring the database from shared file
  const confirmRestoreFromLocation = (): Promise<boolean> => {
    return new Promise((resolve) => {
      presentAlert({
        cssClass: 'custom-alert',
        header: t('backup.restore_backup'),
        message: t('backup.restore_backup_question'),
        buttons: [
          {
            text: t('common.cancel'),
            role: 'cancel',
            handler: () => resolve(false),
          },
          {
            text: t('backup.restore'),
            handler: () => resolve(true),
          },
        ],
      });
    });
  };

    
  

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
        {/* Screen Header */}
        <section className='centered-container'>
          <h2 className='screen-title'>{t('backup.backup_title')}</h2>
        </section>
        
        {/* Card section */}
        <section>
          {/* DEXIE BACKUP (PREMIUM UPSELL) */}
          <div className='card'>
            <div className="flex backup-title mb-10">
              <IonIcon icon={cloud} className='mr-5' />
              Dexie Cloud Sync
            </div>

            <div className='flex-space-bottom'>
              <span>
                {t('backup.card_dexie_text')}
              </span>
              <div>
                {/* Changed button text and action to match an upsell flow instead of manual backup */}
                <IonButton className='ultra-small ml-5' color="primary">
                  <IonIcon icon={diamond} className='mr-5' />
                  {t('premium.upgrade')}
                </IonButton>
              </div>
            </div>
          </div>

          {/* LOCAL BACKUP */}
          <div className='card mt-20'>
            <div className="backup-title mb-10">
              <IonIcon icon={idCard} className='mr-5' />
              {t('backup.card_device_title')}
            </div>

            <div className='flex-space-bottom'>
              <div>
              <div className={`flex mr-5 ${latestBackup ? 'text-success' : 'text-warning'}`}>
                <IonIcon
                  icon={latestBackup ? checkmarkCircle : alertCircle}
                  className="mr-5"
                  style={{ color: 'inherit', fontSize: '16px' }}
                />

                <span>
                  {latestBackup ? t('backup.last_available') : t('backup.no_backups_yet')}
                </span>
              </div>

                <div className='expense-payment-status note'>
                  {latestBackup
                    ? `${formatDate(latestBackup.mtime)} (${formatSize(latestBackup.size)})`
                    : t('backup.create_first')}
                </div>
              </div>
              <div>
                <IonButton
                  className='ultra-small'
                  onClick={createManualBackup}
                  disabled={isCreatingBackup}
                >
                  {isCreatingBackup
                    ? t('backup.creating_backup')
                    : t('backup.backup_now')}
                </IonButton>
              </div>
            </div>
          </div>

            {/* RESTORE FROM FILE SECTION */}
            <div className='card mt-20'>
              <div className="backup-title mb-10">
                <IonIcon icon={server} className='mr-5' />
                {t('backup.restore_from_file')}
              </div>

              <div className='flex-space-bottom'>
                <span>
                  {t('backup.restore_from_file_text')}
                </span>
                <div>
                  <IonButton className='ultra-small' onClick={() => fileInputRef.current?.click()}>
                    {t('common.select')}
                  </IonButton>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  style={{ display: 'none' }}
                  onChange={handleImportBackup}
                />
            </div>
          </div>
        </section>

        {/* EXISTING BACKUPS */}
        <section>
          {files.length > 0 && (
            <section>
              <div className='section-header'>
                <div>
                  <h6 className="section-title">{t('backup.recent_backups')}</h6>
                </div>
              </div>
                {files.map(file => (
                  <div className='expense-item' key={file.name}>
                    <div className='center-col'>
                      {/* Original due date */}
                      <h6 className='original-due-date'>{file.name}</h6>

                      {/* Payment status */}
                      <div className='expense-payment-status note'>
                        {formatDate(file.mtime)} ({formatSize(file.size)})
                      </div>
                    </div>
                    <div className='right-col'>
                      <IonIcon 
                        icon={shareSocialOutline} 
                        className='icon-btn'
                        onClick={() => shareBackup(file.name)} 
                      >
                      </IonIcon>                      
                    </div>
                  </div>
                ))}
            </section>
          )}
        </section>

        {/* Backup confirmation toast */}
        <CustomToast
          message={toastMessage}
          isOpen={toastOpen}
          onDismiss={() => setToastOpen(false)}
          type={toastType ?? undefined}
        />
      </IonContent>
      <Footer appPages={translatedMenuItems} />
    </IonPage>
  );
};

export default TestPage;