import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Dexie from 'dexie'; 
import { Preferences } from '@capacitor/preferences'; 
import { Directory, Filesystem, } from '@capacitor/filesystem'; 
import { db, setIsSeeding, SubscriptionPlan } from '../db';

// Custom hooks
import useScrollToTop from '../hooks/useScrollToTop';
import { useUser } from '../context/UserContext'; // Import the useUser hook

// Ionic components
import { 
  IonContent,
  IonIcon, 
  IonItem,
  IonHeader, 
  IonLabel,
  IonList,
  IonNote, 
  IonPage, 
  IonSelect,
  IonSelectOption,
  IonToolbar,
} from '@ionic/react';

// App components
import LanguageSelector from '../components/LanguageSelector';
import ModePreferenceSelector from '../components/ModePreferenceSelector';
import Footer from '../components/Footer'


// Ion icon components
import { 
  add,
  arrowDownCircleOutline, 
  calendarOutline, 
  cardOutline, 
  cashOutline, 
  checkmarkCircle, 
  colorPaletteOutline, 
  folderOpenOutline, 
  homeOutline,
  languageOutline, 
  layersOutline, 
  lockClosedOutline,
  moonOutline, 
  peopleOutline, 
  personOutline, 
  refreshOutline, 
  serverOutline, 
  timeOutline 
} from 'ionicons/icons';


// Styles
import '../Main.css';
import './Settings.css';


// Footer items
interface AppPage {
  url: string;
  icon: string;
  title: string;
}

const appPages: AppPage[] = [
  { title: 'dashboard', url: '/dashboard', icon: homeOutline },
  { title: 'accounts', url: '/accounts', icon: layersOutline },
  { title: 'Add', url: '/newexpense/0', icon: add },
  { title: 'activity', url: '/activity', icon: cashOutline }
];



const Settings: React.FC = () => {
  const contentRef = useScrollToTop(); // use the custom hook 
  const { user, updateUser } = useUser(); // Access user context
  const { lastName, avatar, email, interval, weekStartDay } = user; // Extract the subscribed property
  const { t } = useTranslation();
  const name = user.name || t('common.default_user_name');

  // Initialize state with value
  const [selectedInterval, setSelectedInterval] = useState<string>(interval); 
  const [selectedWeekStartDay, setSelectedWeekStartDay] = useState<string>(weekStartDay); 
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(user.subscriptionPlan);

  // Translate footer menu items
  const translatedMenuItems = appPages.map((item) => ({
    ...item,
    title: t(`common.${item.title}`, { defaultValue: item.title }),
  }));
  
  useEffect(() => {
    setSelectedPlan(user.subscriptionPlan);
  }, [user.subscriptionPlan]);

  // Sync selectedInterval with interval from context
  useEffect(() => {
    if (interval) {
      setSelectedInterval(interval); // Update state when interval changes
    }
  }, [interval]); // Run this effect whenever `interval` changes

  useEffect(() => {
    if (weekStartDay) {
      setSelectedWeekStartDay(weekStartDay); // Update state when interval changes
    }
  }, [weekStartDay]); // Run this effect whenever `interval` changes


  const handleInterval = (value: "weekly" | "monthly" | "yearly") => {
    setSelectedInterval(value); // Update state
    updateUser({ interval: value }); // Update the UserContext
  };

  const handleWeekStartDay = (value: "sunday" | "monday") => {
    setSelectedWeekStartDay(value); // Update state
    updateUser({ weekStartDay: value }); // Update the UserContext
  };



  const handleFactoryReset = async () => {
    const confirmed = window.confirm(
      'Factory Reset?\n\n' +
      'This will delete:\n' +
      '- All database data\n' +
      '- All preferences\n' +
      '- All backup files\n\n' +
      'The app will restart as a fresh installation.'
    );
  
    if (!confirmed) {
      return;
    }
  
    try {
      await factoryReset();
    } catch (error) {
      console.error(error);
    }
  };


  const factoryReset = async (): Promise<void> => {
    try {
      console.log('🧨 FACTORY RESET STARTED');
  
      //
      // Prevent backup hooks from counting deletes
      //
      setIsSeeding(true);
  
      //
      // STEP 1
      // Delete backups folder
      //
      try {
        await Filesystem.rmdir({
          path: 'backups',
          directory: Directory.Data,
          recursive: true,
        });
  
        console.log('✅ Backups folder removed');
      } catch {
        console.log('ℹ️ No backups folder found');
      }
  
      //
      // STEP 2
      // Delete exchange rates cache
      //
      try {
        await Filesystem.deleteFile({
          path: 'exchange-rates.json',
          directory: Directory.Data,
        });
  
        console.log('✅ Exchange rates cache removed');
      } catch {
        console.log('ℹ️ No exchange-rates.json found');
      }
  
      //
      // STEP 3
      // Clear Capacitor Preferences
      //
      await Preferences.clear();
  
      //
      // STEP 4
      // Clear browser storage (safe on native)
      //
      localStorage.clear();
      sessionStorage.clear();
  
      //
      // STEP 5
      // Clear Cache API (PWA/browser only)
      //
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map((name) => caches.delete(name))
          );
  
          console.log('✅ Browser caches cleared');
        } catch (err) {
          console.warn('⚠️ Failed clearing Cache API', err);
        }
      }
  
      //
      // STEP 6
      // Verify Preferences are empty
      //
      const remaining = await Preferences.keys();
  
      if (remaining.keys.length > 0) {
        console.warn(
          '⚠️ Remaining Preferences:',
          remaining.keys
        );
      } else {
        console.log('✅ Preferences cleared');
      }
  
      //
      // STEP 7
      // Close Dexie
      //
      db.close();
  
      //
      // STEP 8
      // Give IndexedDB time to close
      //
      await new Promise(resolve =>
        setTimeout(resolve, 500)
      );
  
      //
      // STEP 9
      // Delete IndexedDB
      //
      await Dexie.delete('DB');
  
      console.log('✅ IndexedDB deleted');
  
      //
      // STEP 10
      // Reload app
      //
      window.location.replace('/startup');
    } catch (error) {
      console.error('❌ Factory reset failed:', error);
      throw error;
    } finally {
      setIsSeeding(false);
    }
  };
const handleSubscriptionPlan = async (plan: SubscriptionPlan) => {
  if (plan === user.subscriptionPlan) return;

  let isPremium = false;
  if(plan !== 'free') isPremium = true;

  try {
    await updateUser({
      subscriptionPlan: plan,
      isPremium
    });
  } catch (error) {
    console.error("Failed to update subscription plan:", error);
  }
};

  
  

  return (
    <IonPage>
      <IonHeader className='page-header ion-no-border'>
        <IonToolbar>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-horizontal" ref={contentRef}>
        <div className="centered-container mb-20">
          <h2 className='screen-title'>{t('common.settings')}</h2>
        </div>

        
        {/* Profile Bar */}
        <IonList className='profile-settings'>
          <IonItem detail={true} routerLink='/profile' lines="none" className='no-padding'>
            <IonLabel>
              <div className='profile-avatar-bar'>
                {avatar ? (
                  // Display the avatar image if it exists
                  <img
                    src={avatar}
                    alt={`${name}'s Avatar`}
                    className="profile-avatar-image"
                  />
                ) : (
                  // Display initials if no avatar is set
                  <div className="profile-avatar">
                    {name.charAt(0)}
                    {lastName.charAt(0)}
                  </div>
                )}
                <div className='profile-name'>
                  <p>{name} {lastName}</p>
                  {email ? (
                    <IonNote>{email}</IonNote>
                  ) : (
                    <IonNote>{t('settings.add_email')}</IonNote>
                  )}
                </div>
              </div>
            </IonLabel>
          </IonItem>
        </IonList>

        {/* General settings */}
        <section>
          <div className="section-header">
            <h6 className='section-title'>{t('settings.general')}</h6>
          </div>
          <IonList> 
            {/* Language */}
            <IonItem>
              <IonIcon aria-hidden="true" icon={languageOutline} slot="start"></IonIcon>
              <LanguageSelector />
            </IonItem>

            {/* Week starting day */}
            <IonItem>
              <IonIcon aria-hidden="true" icon={calendarOutline} slot="start"></IonIcon>
              <IonSelect 
                label={t('date.week-start')}
                placeholder={t('categories.make_a_selection')}
                value={selectedWeekStartDay}
                onIonChange={(e) => handleWeekStartDay(e.detail.value)}
                interface="popover"
              >
                <IonSelectOption value="sunday">{t('date.sunday')}</IonSelectOption>
                <IonSelectOption value="monday">{t('date.monday')}</IonSelectOption>
              </IonSelect>
            </IonItem>

            {/* Data Frecuendy */}
            <IonItem>
              <IonIcon aria-hidden="true" icon={timeOutline} slot="start"></IonIcon>
              <IonSelect 
                label={t('common.frecuency')}
                placeholder={t('categories.make_a_selection')}
                value={selectedInterval}
                onIonChange={(e) => handleInterval(e.detail.value)}
                interface="popover"
              >
                <IonSelectOption value="weekly">{t('date.weekly')}</IonSelectOption>
                <IonSelectOption value="monthly">{t('date.monthly')}</IonSelectOption>
                <IonSelectOption value="yearly">{t('date.yearly')}</IonSelectOption>
              </IonSelect>
            </IonItem>

            {/* Currency */}
            <IonItem detail={true} lines="none" routerLink="/currency">
              <IonIcon aria-hidden="true" icon={cashOutline} slot="start"></IonIcon>
              <IonLabel>{t('settings.currency')}</IonLabel>
            </IonItem>

          </IonList>
        </section>

        {/* Personalization */}
        <section>
          <div className="section-header">
            <h6 className='section-title'>{t('settings.personalization')}</h6>
          </div>
          <IonList>
            {/* Mode preferences */}
            <IonItem>
              <IonIcon aria-hidden="true" icon={moonOutline} slot="start"></IonIcon>
              <ModePreferenceSelector />
            </IonItem>

            {/* Themes */}
            <IonItem lines="none" detail={true} routerLink="/themes">
              <IonIcon aria-hidden="true" icon={colorPaletteOutline} slot="start"></IonIcon>
              <IonLabel>{t('settings.themes')}</IonLabel>
            </IonItem>
          </IonList>
        </section>

        {/* Data & Storage */}
        <section>
          <div className="section-header">
            <h6 className='section-title'>{t('settings.data_storage')}</h6>
          </div>
          <IonList>
            {/* Configure Back Up */}
            <IonItem detail={true} routerLink="/backup">
              <IonIcon aria-hidden="true" icon={arrowDownCircleOutline} slot="start"></IonIcon>
              <IonLabel>{t('settings.back_up')}</IonLabel>
            </IonItem>
          </IonList>
        </section>

        {/* Account */}
        <section>
          <div className="section-header">
            <h6 className='section-title'>{t('settings.account')}</h6>
          </div>
          <IonList>
            {/* Edit Profile */}
            <IonItem detail={true} routerLink="/profile">
              <IonIcon aria-hidden="true" icon={personOutline} slot="start"></IonIcon>
              <IonLabel>{t('common.edit_profile')}</IonLabel>
            </IonItem>

            {/* Change Password */}
            <IonItem detail={true} routerLink="/default">
              <IonIcon aria-hidden="true" icon={lockClosedOutline} slot="start"></IonIcon>
              <IonLabel>{t('settings.change_pass')}</IonLabel>
            </IonItem>

            {/* Reset Account */}
            <IonItem detail={true} routerLink="/default">
              <IonIcon aria-hidden="true" icon={refreshOutline} slot="start"></IonIcon>
              <IonLabel>{t('settings.reset_account')}</IonLabel>
            </IonItem>

            {/* Billing ans Subscription */}
            <IonItem lines='none' detail={true} routerLink="/billing">
              <IonIcon aria-hidden="true" icon={cardOutline} slot="start"></IonIcon>
              <IonLabel>{t('settings.billing_subs')}</IonLabel>
            </IonItem>
          </IonList>
        </section>

        {/* DEV - File Exporer */}
        <section>
          <div className="section-header">
            <h6 className='section-title'>DEV ONLY</h6>
          </div>
          <IonList>
            {/* File Explorer */}
            <IonItem detail={true} routerLink="/devFileExplorer">
              <IonIcon aria-hidden="true" icon={folderOpenOutline} slot="start"></IonIcon>
              <IonLabel>DEV - File Explorer</IonLabel>
            </IonItem>

            {/* Factory reset */}
            <IonItem
              button
              color="danger"
              lines="none"
              onClick={handleFactoryReset}
            >
              <IonIcon
                aria-hidden="true"
                icon={serverOutline}
                slot="start"
              />
              <IonLabel>Factory Reset</IonLabel>
            </IonItem>

            {/* Other actions */}
            <IonItem detail={true} routerLink="/devOtherActions">
              <IonIcon aria-hidden="true" icon={folderOpenOutline} slot="start"></IonIcon>
              <IonLabel>Other actions</IonLabel>
            </IonItem>

            {/* Seeding */}
            <IonItem detail={true} lines="none" routerLink="/devSeeding">
              <IonIcon aria-hidden="true" icon={folderOpenOutline} slot="start"></IonIcon>
              <IonLabel>Seed Expenses</IonLabel>
            </IonItem>

            {/* Simulate subscription plan selection */}
            <IonItem>
              <IonIcon aria-hidden="true" icon={cardOutline} slot="start" />
              <IonSelect
                label="Subscription plan"
                placeholder="Select plan"
                value={selectedPlan}
                onIonChange={(e) => handleSubscriptionPlan(e.detail.value)}
                interface="popover"
              >
                <IonSelectOption value="free">
                  Free
                </IonSelectOption>

                <IonSelectOption value="monthly">
                  Monthly
                </IonSelectOption>

                <IonSelectOption value="quarterly">
                  Quarterly
                </IonSelectOption>

                <IonSelectOption value="yearly">
                  Yearly
                </IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem  className={!user.isPremium && user.subscriptionPlan === 'free' ? 'disabled' : ''}>
              <IonIcon aria-hidden="true" icon={checkmarkCircle} slot="start" />
              <IonSelect
                label="Subscription status"
                value={
                  user.subscriptionPlan === 'free'
                    ? "free"
                    : user.isPremium
                      ? "active"
                      : "expired"
                }
                onIonChange={(e) =>
                  updateUser({
                    isPremium: e.detail.value === "active",
                  })
                }
                interface="popover"
              >
                <IonSelectOption value="active">Active</IonSelectOption>
                <IonSelectOption value="expired">Expired</IonSelectOption>
              </IonSelect>
            </IonItem>
          </IonList>
        </section>

      </IonContent>

      <Footer appPages={translatedMenuItems} />

    </IonPage>
  );
};

export default Settings;