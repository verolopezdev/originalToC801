import React, { useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonList, IonItem, IonLabel, IonButton, IonTextarea, 
  IonItemDivider, IonIcon, IonButtons, IonBackButton 
} from '@ionic/react';
import { documentTextOutline, eyeOutline } from 'ionicons/icons';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const FileExplorer: React.FC = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [selectedContent, setSelectedContent] = useState<string>('');
  const [preferencesContent, setPreferencesContent] = useState<string>('');
  const [exchangeRatesContent, setExchangeRatesContent] = useState<string>('');

  // 1. Fetch the list of files on load
  const loadBackups = async () => {
    try {
      const result = await Filesystem.readdir({
        path: 'backups',
        directory: Directory.Data,
      });
      // Sort newest first
      const sortedFiles = result.files.sort((a, b) => b.name.localeCompare(a.name));
      setBackups(sortedFiles);
    } catch (e) {
      console.error("No backups folder found or empty", e);
    }
  };

  const loadPreferences = async () => {
    try {
      const { keys } = await Preferences.keys();
  
      const allPrefs: Record<string, any> = {};
  
      for (const key of keys) {
        const { value } = await Preferences.get({ key });
  
        try {
          allPrefs[key] = JSON.parse(value || '');
        } catch {
          allPrefs[key] = value;
        }
      }
  
      setPreferencesContent(
        JSON.stringify(allPrefs, null, 2)
      );
  
    } catch (e) {
      console.error('Error loading preferences', e);
    }
  };

  const loadExchangeRatesFile = async () => {
    try {
      const file = await Filesystem.readFile({
        path: 'exchange-rates.json',
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
  
      try {
        const json = JSON.parse(file.data as string);
        setExchangeRatesContent(JSON.stringify(json, null, 2));
      } catch {
        setExchangeRatesContent(file.data as string);
      }
    } catch (e) {
      console.error('Error loading exchange-rates.json', e);
      setExchangeRatesContent('exchange-rates.json not found');
    }
  };


  useEffect(() => {
    loadBackups();
    loadPreferences();
    loadExchangeRatesFile();
  }, []);

  // 2. Read a specific file's content
  const viewFile = async (fileName: string) => {
    try {
      const contents = await Filesystem.readFile({
        path: `backups/${fileName}`,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      
      // If it's your Master Backup JSON, let's pretty-print it
      const json = JSON.parse(contents.data as string);
      setSelectedContent(JSON.stringify(json, null, 2));
    } catch (e) {
      console.error("Error reading file", e);
      setSelectedContent("Error reading file or file is not valid JSON.");
    }
  };

  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
          <IonTitle>File Explorer</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <p>Available Backups stored in native sandbox (Directory.Data)</p>
        
        {backups.length === 0 && <IonItem>No backups found.</IonItem>}
        {backups.map((file) => (
          <IonItem key={file.name}>
            <IonLabel>
              {file.name}
              <p><small>{new Date(parseInt(file.name.split('-')[1])).toLocaleString()}</small></p>
            </IonLabel>
            <IonIcon
              icon={eyeOutline}
              className='icon-btn'
              onClick={() => viewFile(file.name)}
            />
          </IonItem>
        ))}
        <section className='mt-20'>
          <h6 className="section-title">Backup Content</h6>

          <IonTextarea
            rows={20}
            readonly
            value={selectedContent}
            placeholder="Select a backup to view its content..."
            style={{ whiteSpace: 'pre-wrap' }}
          />
        </section>
  

        <section>
          <h6 className="section-title">exchange-rates.json</h6>

          <IonTextarea
          rows={20}
          readonly
          value={exchangeRatesContent}
          placeholder="exchange-rates.json not found..."
          style={{ whiteSpace: 'pre-wrap' }}
          />
        </section>

        <section>
          <h6 className="section-title">Device Preferences</h6>

          <IonTextarea
            rows={20}
            readonly
            value={preferencesContent}
            placeholder="No preferences found..."
            style={{ whiteSpace: 'pre-wrap' }}
          />
        </section>
      </IonContent>
    </IonPage>
  );
};

export default FileExplorer;