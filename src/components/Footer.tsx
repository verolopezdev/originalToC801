import { useTranslation } from 'react-i18next';

// Ionic components
import {
  IonFab,
  IonFabButton,
  IonFooter,
  IonIcon,
  IonMenuButton,
  IonRouterLink,
  IonToolbar
} from '@ionic/react';

// Styles
import '../Main.css'; 
import './Footer.css';

interface FooterProps {
  appPages: Array<{
    url: string;
    icon: string;
    title: string;
  }>;
}


const Footer: React.FC<FooterProps> = ({ appPages }) => {   
  const { t } = useTranslation();
  
  
  return (
    <IonFooter className="footer">
      <IonToolbar>
        <div className="grid-container">  
          {/* <div className="grid-item">Item 1</div> */}
          {appPages.map((appPage, index) => {
            // Check if the current element is the third one (index 2)
            if (index === 2) {
              return (
                <IonRouterLink 
                  key={index}
                  routerLink={appPage.url} 
                  routerDirection="forward"
                  style={{ textDecoration: 'none' }} /* Optional: remove underline styling */
                >
                  <div 
                    key={index}
                  >
                    <IonFab horizontal="center">
                      <IonFabButton>
                        <IonIcon icon={appPage.icon} />
                      </IonFabButton>
                    </IonFab>
                  </div>
                </IonRouterLink>
              );
            }

            // Render a regular IonItem for other elements
            return (
              <IonRouterLink 
                key={index}
                routerLink={appPage.url} 
                routerDirection="forward"
                className={`${location.pathname === appPage.url ? 'selected-item' : ''}`}
                style={{ textDecoration: 'none' }} /* Optional: remove underline styling */
              >
                <div 
                  className="icon-text"
                  key={index}
                >
                  <IonIcon aria-hidden="true" icon={appPage.icon} />
                  <span>{appPage.title}</span>
                </div>
              </IonRouterLink>
            );
          })}
            
          <div 
            className="icon-text"
            key={5}
          >
            <IonMenuButton                     
              menu="appMenu" // this links to your custom menu
              autoHide={false} // optional, prevents it from hiding automatically
            /> 
            <span className='menu-name'>{t('common.menu')}</span> 
          </div>
        </div>
      </IonToolbar>
    </IonFooter>
  );
};

export default Footer;
