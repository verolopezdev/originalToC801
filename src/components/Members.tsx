import React from 'react'; 
import { useTranslation } from 'react-i18next'; 
import { IonItem, IonLabel, IonList, IonNote, } from '@ionic/react'; 
import { useUser } from '../context/UserContext'; 

const Members: React.FC = () => { 
  const { t } = useTranslation(); 
  const { user } = useUser(); 
  const name = user.name || t('common.default_user_name'); 
  const lastName = user.lastName || ''; 
  
  return ( 
    <section> 
      <h6 className="section-title"> Members </h6> 
      <IonList lines="inset" className="no-padding"> 
        <IonItem> 
          <IonLabel> 
            <div className="profile-avatar-bar"> 
              {user.avatar ? ( 
                <img src={user.avatar} alt={`${name}'s Avatar`} className="profile-avatar-image" /> 
              ) : (
                 <div className="profile-avatar"> {name.charAt(0)} {lastName.charAt(0)} </div> 
              )} 
              
              <div className="profile-name"> 
                <p> {name} {lastName} </p> 
                <IonNote> Administrator </IonNote> 
              </div> 
            </div> 
          </IonLabel> 
        </IonItem> 
      </IonList> 
    </section> 
  ); 
}; 

export default Members;