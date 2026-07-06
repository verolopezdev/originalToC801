import React, { useEffect, useState } from "react";
import { handleStartupRecovery } from './services/BackupService';
import { IonApp, IonContent, IonRouterOutlet, IonSpinner, IonSplitPane, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { ThemeProvider } from './theme/ThemeContext'; // Import the ThemeProvider
import { ExpenseProvider } from './context/ExpenseContext';
import { IntervalProvider } from './context/IntervalContext';
import { ExchangeRateProvider } from './context/ExchangeRateContext';
import { DatePickerProvider } from './context/DatePickerContext';
import { NumericKeypadProvider } from './context/NumericKeypadContext';
import { refreshSubscription } from "./services/SubscriptionService";

// App components
import Accounts from './pages/Accounts';
import Activity from './pages/Activity';
import BackUp from './pages/BackUp';
import Billing from './pages/Billing';
import Calendar from './pages/Calendar';
import Categories from './pages/Categories';
import CountrySelectionPage from './pages/CountrySelectionPage';
import Currency from './pages/Currency';
import Dashboard from './pages/Dashboard';
import DefaultPage from './pages/DefaultPage';
import EditAccount from './pages/EditAccount';
import EditCategory from './pages/EditCategory';
import EditExpense from './pages/EditExpense';
import EditRecurrence from './pages/EditRecurrence';
import EditSubcategory from './pages/EditSubcategory';
import EditTrip from './pages/EditTrip';
import ExportData from './pages/ExportData';
import FileExplorer from './pages/FileExplorer';
import GetPremium from './pages/GetPremium';
import HelpPage from './pages/HelpPage';
import LogOut from './pages/LogOut';
import LogRecurrenceExpense from './pages/LogRecurrenceExpense';
import Menu from './components/Menu';
import NewAccount from './pages/NewAccount';
import NewCategory from './pages/NewCategory';
import NewExpense from './pages/NewExpense';
import NewSubCategory from './pages/NewSubCategory';
import NewTrip from './pages/NewTrip';
import OtherActions from './pages/OtherActions';
import OtherPeriods from './pages/OtherPeriods';
import Profile from './pages/Profile';
import Reccurrences from './pages/Recurrences';
import Statistics from './pages/Statistics';
import StatisticsCategory from './pages/StatisticsCategory';
import SeedExpensesPage from './pages/SeedExpensesPage';
import Settings from './pages/Settings';
import SplashScreen from "./pages/SplashScreen";
import StartupRedirect from './pages/StartupRedirect';
import TestPage from './pages/TestPage';
import ThemePage from './pages/ThemePage';
import TravelMode from './pages/TravelMode';
import ViewRecurrence from './pages/ViewRecurrence';
import ViewTrip from './pages/ViewTrip';



/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Settings for portrait orientation only */
import { ScreenOrientation } from '@capacitor/screen-orientation';
ScreenOrientation.lock({ orientation: 'portrait' });

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
import '@ionic/react/css/palettes/dark.class.css';
// import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';
import { CurrencyProvider } from './context/CurrencyContext';
import { TripProvider } from './context/TripContext';

setupIonicReact();



const App: React.FC = () => {

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log(
          "%c========== APP RESTART ==========",
          "background: green; color: white;"
        );
  
        const start = performance.now();
  
        // 1. Restore backup if needed
        await handleStartupRecovery();
  
        // 2. Refresh subscription (mock now, RevenueCat later)
        await refreshSubscription();
  
        const elapsed = performance.now() - start;
  
        console.log(
          "%cRestore Check",
          "background: red; color: white;",
          `${elapsed.toFixed(2)}ms`
        );
      } catch (error) {
        console.error("Failed to initialize app:", error);
      }
    };
  
    initializeApp();
  }, []);


  

  return (
      <UserProvider>
        <ThemeProvider> 
          <CurrencyProvider>
            <ExchangeRateProvider>
              <DatePickerProvider>
                <NumericKeypadProvider>
                  <ExpenseProvider>
                    <IntervalProvider>
                      <TripProvider>
                        <IonApp>
                          <IonReactRouter>
                            <IonSplitPane contentId="main">
                              <Menu />
                              <IonRouterOutlet id="main" animated={false}>
                                {/* Use StartupRedirect to handle the first-time redirect logic */}
                                <Route path="/startup" component={StartupRedirect} exact />
                                <Route path="/select-country" component={CountrySelectionPage} exact />
                                <Route path="/dashboard" component={Dashboard} exact />

                                {/* Always redirect from the root to /startup */}
                                <Redirect exact from="/" to="/startup" />

                                <Route path="/accounts" component={Accounts} exact />
                                <Route path="/activity" component={Activity} exact />
                                <Route path="/backup" component={BackUp} exact />
                                <Route path="/billing" component={Billing} exact />
                                <Route path="/calendar" component={Calendar} exact />
                                <Route path="/categories" component={Categories} exact />
                                <Route path="/currency" component={Currency} exact />      
                                <Route path="/dashboard" component={Dashboard} exact />
                                <Route path="/default" component={DefaultPage} exact />

                                <Route path="/devFileExplorer" component={FileExplorer} exact />
                                <Route path="/devOtherActions" component={OtherActions} exact />
                                <Route path="/devSeeding" component={SeedExpensesPage} exact />

                                <Route path="/editaccount/:accountId" component={EditAccount} exact />
                                <Route path="/editcategory/:categoryId" component={EditCategory} exact />
                                <Route path="/editexpense/:expenseId" component={EditExpense} exact />
                                <Route path="/editrecurrence/:seriesId" component={EditRecurrence} exact />
                                <Route path="/editsubcategory/:categoryId" component={EditSubcategory} exact />
                                <Route path="/edittrip/:tripId" component={EditTrip} exact />
                                <Route path="/exportdata" component={ExportData} exact />
                                <Route path="/getpremium" component={GetPremium} exact />
                                <Route path="/help" component={HelpPage} exact />
                                <Route path="/logout" component={LogOut} exact />
                                <Route path="/logrecurrenceexpense/:seriesId" component={LogRecurrenceExpense} exact />
                                <Route path="/newaccount" component={NewAccount} exact />
                                <Route path="/newcategory" component={NewCategory} exact />
                                <Route path="/newexpense/:passedAccountId" component={NewExpense} exact />
                                <Route path="/newsubcategory/:categoryId" component={NewSubCategory} exact />
                                <Route path="/newtrip" component={NewTrip} exact />
                                <Route path="/otherperiods" component={OtherPeriods} exact />
                                <Route path="/profile" component={Profile} exact />
                                <Route path="/reccurrences" component={Reccurrences} exact />
                                <Route path="/statisticscategory/:categoryId/:year/:month" component={StatisticsCategory} exact />
                                <Route path="/select-country" component={CountrySelectionPage} exact />
                                <Route path="/settings" component={Settings} exact />
                                <Route path="/splashscreen" component={SplashScreen} exact />
                                <Route path="/startup" component={StartupRedirect} exact />
                                <Route path="/statistics" component={Statistics} exact />
                                <Route path="/testpage" component={TestPage} exact />
                                <Route path="/themes" component={ThemePage} exact />
                                <Route path="/travelmode" component={TravelMode} exact />
                                <Route path="/viewtrip/:tripId" component={ViewTrip} exact />
                                <Route path="/viewrecurrence/:seriesId" component={ViewRecurrence} exact />
                              </IonRouterOutlet>
                            </IonSplitPane>
                          </IonReactRouter>
                        </IonApp>
                      </TripProvider>
                    </IntervalProvider>
                  </ExpenseProvider>
                </NumericKeypadProvider>
              </DatePickerProvider>
            </ExchangeRateProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </UserProvider>
  );
};

export default App;
