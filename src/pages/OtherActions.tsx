import React from 'react';
import { Preferences } from '@capacitor/preferences';
import { clearAllData, deleteDatabaseEntirely, deleteRecords } from '../db';
import { useTranslation } from 'react-i18next'; 

// App components
import Footer from '../components/Footer';


// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';

// Ionic's components
import { 
  IonBackButton,
  IonButton,
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonToolbar 
} from '@ionic/react';


// Icons
import { 
  add,
  cashOutline, 
  home,
  homeOutline,
  layersOutline,
} from 'ionicons/icons';


// Footer items
interface AppPage {
  url: string;
  icon: string;
  title: string;
}

const appPages: AppPage[] = [
  { title: 'dashboard', url: '/app/dashboard', icon: homeOutline },
  { title: 'accounts', url: '/app/accounts', icon: layersOutline },
  { title: 'Add', url: '/app/newexpense/0', icon: add },
  { title: 'activity', url: '/app/activity', icon: cashOutline }
];


// Styles
import '../Main.css';

const OtherActions: React.FC = () => {
  const { t } = useTranslation();
  
  const contentRef = useScrollToTop(); // use the custom hook 
  
  // Delete 10 records from expenses table, to trigger missing data
  const handleRemoveXRecords = async () => {
    try {
      await deleteRecords();
      alert("Removed 10 expenses (if they existed).");
      window.location.reload();
    } catch (err) {
      alert("Delete failed.");
    }
  };

  // Function for clearing all records
  const handleDeleteDB = async () => {
    const confirmed = window.confirm(
      "DANGER: This will delete ALL records to test the restore function. Continue?"
    );

    if (confirmed) {
      try {
        await clearAllData();
        alert("Database is now empty. You can now test your restore workflow.");
        window.location.reload(); 
      } catch (err) {
        alert("Error clearing data.");
      }
    }
  };


  // 1. Full wipe: Total db and preferences deletion
  const handleFullWipe = async () => {
    const confirmed = window.confirm(
      "EXTREME DANGER: This deletes the entire database file and preferences. The app will need to reload to re-initialize. Proceed?"
    );

    if (confirmed) {
      try {
        await deleteDatabaseEntirely();
        await Preferences.clear();
        alert("Database and preferences deleted. Reloading app...");
        window.location.reload(); 
      } catch (err) {
        alert("Error nuking database.");
      }
    }
  };
  


  // 2. Total db deletion
  const handleNukeDB = async () => {
    const confirmed = window.confirm(
      "EXTREME DANGER: This deletes the entire database file. The app will need to reload to re-initialize. Proceed?"
    );

    if (confirmed) {
      try {
        await deleteDatabaseEntirely();
        alert("Database deleted. Reloading app...");
        window.location.reload(); 
      } catch (err) {
        alert("Error nuking database.");
      }
    }
  };


  // Translate footer menu item titles
  const translatedMenuItems = appPages.map((item) => ({
    ...item,
    title: t(`common.${item.title}`, { defaultValue: item.title }),
  }));
  

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
        <h1>DEV Other Actions</h1>

        <section className='mt-20'>
          <h4>1. Full wipe </h4>
          <p>Entire database and preferences disappear.</p>
          <IonButton 
            expand="block" 
            color="secondary" 
            onClick={handleFullWipe}
          >
            Full Wipe
          </IonButton>
        </section>

        <section className='mt-20'>
          <h4>2. DB Wipe </h4>
          <p>Entire database disappears. DB file is deleted physically.</p>
          <IonButton 
            expand="block" 
            color="secondary" 
            onClick={handleNukeDB}
          >
            Nuke DB
          </IonButton>
        </section>

        <section>
          <h4>3. Clear DB</h4>
          <p>Db exists but all tables are empty...</p>
          <IonButton 
            expand="block" 
            color="secondary" 
            onClick={handleDeleteDB}
          >
            Delete DB content
          </IonButton>
        </section>

        <section>
          <h4>4. Some tables lose data</h4>
          <p>Possible, especially if: </p> 
          <ul>
            <li>storage corruption occurs</li>
            <li>writes were interrupted</li>
            <li>quota eviction happens</li>
            <li>IndexedDB transactions were not fully committed</li>
          </ul>
          
          <p>Delete 10 expenses to simulate partial data loss...</p>
          <IonButton 
            expand="block" 
            color="secondary" 
            onClick={handleRemoveXRecords}
          >
            Delete 10 Expenses
          </IonButton>
        </section>
        
      </IonContent>
      <Footer appPages={translatedMenuItems} />
    </IonPage>
  );
};

export default OtherActions;