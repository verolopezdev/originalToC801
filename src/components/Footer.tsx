
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
  disableAddButton?: boolean;
}

const Footer: React.FC<FooterProps> = ({
  appPages,
  disableAddButton = false
}) => {
  const { t } = useTranslation();

  return (
    <IonFooter className="footer">
      <IonToolbar>
        <div className="grid-container">

          {appPages.map((appPage, index) => {

            // Central Add button
            if (index === 2) {
              return (
                <div key={appPage.url}>
                  <IonFab horizontal="center">
                    <IonFabButton
                      disabled={disableAddButton}
                      routerLink={disableAddButton ? undefined : appPage.url}
                    >
                      <IonIcon icon={appPage.icon} />
                    </IonFabButton>
                  </IonFab>
                </div>
              );
            }

            // Regular navigation buttons
            return (
              <IonRouterLink
                key={appPage.url}
                routerLink={appPage.url}
                routerDirection="forward"
                className={
                  location.pathname === appPage.url
                    ? 'selected-item'
                    : ''
                }
                style={{ textDecoration: 'none' }}
              >
                <div className="icon-text">
                  <IonIcon aria-hidden="true" icon={appPage.icon} />
                  <span>{appPage.title}</span>
                </div>
              </IonRouterLink>
            );
          })}

          {/* Menu button */}
          <div className="icon-text">
            <IonMenuButton
              menu="appMenu"
              autoHide={false}
            />
            <span className="menu-name">{t('common.menu')}</span>
          </div>

        </div>
      </IonToolbar>
    </IonFooter>
  );
};

export default Footer;
