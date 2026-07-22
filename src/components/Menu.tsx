import { useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext'; // Import the useUser hook
import { useTranslation } from 'react-i18next';

// Ionic components
import {
  IonCol,
  IonContent,
  IonGrid,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonRow,
  IonSearchbar,
  useIonRouter,
} from '@ionic/react';

// Ionic icons
import { 
  barChartOutline, 
  airplaneOutline,
  cogOutline, 
  gridOutline, 
  helpBuoyOutline, 
  layersOutline, 
  logOutOutline, 
  diamond 
} from 'ionicons/icons';

// Styles
import './Menu.css';
import '../Main.css';

interface AppPage {
  url: string;
  icon: string;
  title: string;
}

const appPages: AppPage[] = [
  { title: 'dashboard', url: '/app/dashboard', icon: gridOutline },
  { title: 'categories', url: '/app/categories', icon: layersOutline },
  { title: 'settings', url: '/app/settings', icon: cogOutline },
  { title: 'travel_mode', url: '/app/travelmode', icon: airplaneOutline },
  { title: 'statistics', url: '/app/statistics', icon: barChartOutline },
  { title: 'help', url: '/app/help', icon: helpBuoyOutline },
  { title: 'log_out', url: '/app/logout', icon: logOutOutline }
];


const Menu: React.FC = () => {
  const { user } = useUser(); // Access user context
  const { name, lastName, email, avatar } = user; // Extract the subscribed property
  const { t } = useTranslation();
  
  const location = useLocation();
  const router = useIonRouter();

  const subscriptionMenuLabel =
  user.subscriptionPlan !== "free" && user.isPremium === false
    ? t("plans.renew_premium")
    : user.isPremium
      ? t("plans.subscription")
      : t("plans.get_premium");

  // Translate titles
  const translatedMenuItems = appPages.map((item) => ({
    ...item,
    title: t(`common.${item.title}`, { defaultValue: item.title }),
  }));


  const handleNavigation = () => {
    router.push('/app/profile'); // Navigate to the profile page
  };

  return (
    <IonMenu contentId="main" menuId="appMenu" type="overlay" side="end" swipeGesture={false}>
      <IonContent>
        <IonGrid style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
          {/* Avatar Profile */}
          <IonMenuToggle autoHide={true}>
            <IonRow>
              <IonCol>
                
                {/* App Bar */}
                <IonList className='menu-list'> 
                  <IonItem detail={false} routerLink='/app/profile' lines="none" className='no-padding top-bottom-item'>
                    <IonLabel>
                      <div className='profile-bar mb-20'>
                        <img
                          src='assets/images/logo.png'
                          alt={`${name}'s Avatar`}
                          className="app-image"
                        />
                        <div className='profile-data'>
                          <p>AppName v 0.4.42</p>
                          <span>Expense Tracker</span>
                        </div>
                      </div>
                    </IonLabel>
                  </IonItem>
                </IonList>

              </IonCol>
            </IonRow>
          </IonMenuToggle>

          {/* Search bar */}
          <IonRow>
            <IonCol>
            <IonSearchbar className='menu-search-bar'></IonSearchbar>
            </IonCol>
          </IonRow>

          {/* Menu Items */}
          <IonRow style={{flexGrow: 1 }}>
            <IonCol>
              <IonList id="inbox-list">
                {translatedMenuItems.map((item, index) => {
                  return (
                    <IonMenuToggle key={index} autoHide={false}>
                      <IonItem className={location.pathname === item.url ? 'selected' : ''} routerLink={item.url} routerDirection="forward" lines="none" detail={false}>
                        <IonIcon aria-hidden="true" slot="start" icon={item.icon} />
                        <IonLabel>{item.title}</IonLabel>
                      </IonItem>
                    </IonMenuToggle>
                  );
                })}
                <IonMenuToggle key={10} autoHide={false}>
                  <IonItem
                    routerLink="/app/getpremium"
                    routerDirection="forward"
                    lines="none"
                    detail={false}
                  >
                    <IonIcon aria-hidden="true" slot="start" icon={diamond} />
                    <IonLabel>{subscriptionMenuLabel}</IonLabel>
                  </IonItem>
                </IonMenuToggle>
              </IonList>
            </IonCol>
          </IonRow>

          {/* Bottom content */}
          <IonRow className="ion-align-items-end">
            <IonCol>
              <hr></hr>
              {/* Profile Bar */}
              <IonList className='menu-list'>
                <IonMenuToggle key={20} autoHide={false}>
                  <IonItem routerLink='/app/profile' routerDirection="forward" lines="none" detail={true} className='no-padding ion-no-margin top-bottom-item'>
                    <IonLabel>
                      <div className='profile-bar'>
                        {avatar ? (
                          // Display the avatar image if it exists
                          <div className='avatar-container'>
                            <img
                              src={avatar}
                              alt={`${name}'s Avatar`}
                              className="menu-avatar-image"
                            />
                          </div>
                        ) : (
                          // Display initials if no avatar is set
                          <div className='avatar-container'>
                            <div className="profile-avatar">
                              {name.charAt(0)}
                              {lastName.charAt(0)}
                            </div>
                          </div>
                        )}
                        <div className='profile-data'>
                          <p>{name} {lastName}</p>  
                          {email ? (
                            <span>{email}</span>
                          ) : (
                            <span>{t('settings.add_email')}</span>
                          )}
                        </div>
                      </div>
                    </IonLabel>
                  </IonItem>
                </IonMenuToggle>
              </IonList>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonMenu>
  );
};

export default Menu;
