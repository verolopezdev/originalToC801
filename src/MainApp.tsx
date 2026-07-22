import React from "react";
import { IonRouterOutlet, IonSplitPane } from "@ionic/react";
import { Route } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import { ExchangeRateProvider } from "./context/ExchangeRateContext";
import { DatePickerProvider } from "./context/DatePickerContext";
import { NumericKeypadProvider } from "./context/NumericKeypadContext";
import { ExpenseProvider } from "./context/ExpenseContext";
import { IntervalProvider } from "./context/IntervalContext";
import { TripProvider } from "./context/TripContext";

import Menu from "./components/Menu";

import Accounts from "./pages/Accounts";
import Activity from "./pages/Activity";
import BackUp from "./pages/BackUp";
import Billing from "./pages/Billing";
import Calendar from "./pages/Calendar";
import Categories from "./pages/Categories";
import Currency from "./pages/Currency";
import Dashboard from "./pages/Dashboard";
import DefaultPage from "./pages/DefaultPage";
import EditAccount from "./pages/EditAccount";
import EditCategory from "./pages/EditCategory";
import EditExpense from "./pages/EditExpense";
import EditRecurrence from "./pages/EditRecurrence";
import EditSubcategory from "./pages/EditSubcategory";
import EditTrip from "./pages/EditTrip";
import ExportData from "./pages/ExportData";
import FileExplorer from "./pages/FileExplorer";
import GetPremium from "./pages/GetPremium";
import HelpPage from "./pages/HelpPage";
import LogOut from "./pages/LogOut";
import LogRecurrenceExpense from "./pages/LogRecurrenceExpense";
import NewAccount from "./pages/NewAccount";
import NewCategory from "./pages/NewCategory";
import NewExpense from "./pages/NewExpense";
import NewSubCategory from "./pages/NewSubCategory";
import NewTrip from "./pages/NewTrip";
import OtherActions from "./pages/OtherActions";
import OtherPeriods from "./pages/OtherPeriods";
import Profile from "./pages/Profile";
import Reccurrences from "./pages/Recurrences";
import SeedExpensesPage from "./pages/SeedExpensesPage";
import Settings from "./pages/Settings";
import SplashScreen from "./pages/SplashScreen";
import Statistics from "./pages/Statistics";
import StatisticsCategory from "./pages/StatisticsCategory";
import TestPage from "./pages/TestPage";
import ThemePage from "./pages/ThemePage";
import TravelMode from "./pages/TravelMode";
import ViewRecurrence from "./pages/ViewRecurrence";
import ViewTrip from "./pages/ViewTrip";

const MainApp: React.FC = () => {
  /*   useEffect(() => {
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
 */

  return (
    <UserProvider>
          <ExchangeRateProvider>
            <DatePickerProvider>
              <NumericKeypadProvider>
                <ExpenseProvider>
                  <IntervalProvider>
                    <TripProvider>
                      <IonSplitPane contentId="main">
                        <Menu />

                        <IonRouterOutlet id="main" animated={false}>
                          <Route path="/app/dashboard" component={Dashboard} exact />

                          <Route path="/app/accounts" component={Accounts} exact />
                          <Route path="/app/activity" component={Activity} exact />
                          <Route path="/app/backup" component={BackUp} exact />
                          <Route path="/app/billing" component={Billing} exact />
                          <Route path="/app/calendar" component={Calendar} exact />
                          <Route path="/app/categories" component={Categories} exact />
                          <Route path="/app/currency" component={Currency} exact />
                          <Route path="/app/default" component={DefaultPage} exact />

                          <Route path="/app/devFileExplorer" component={FileExplorer} exact />
                          <Route path="/app/devOtherActions" component={OtherActions} exact />
                          <Route path="/app/devSeeding" component={SeedExpensesPage} exact />

                          <Route path="/app/editaccount/:accountId" component={EditAccount} exact />
                          <Route path="/app/editcategory/:categoryId" component={EditCategory} exact />
                          <Route path="/app/editexpense/:expenseId" component={EditExpense} exact />
                          <Route path="/app/editrecurrence/:seriesId" component={EditRecurrence} exact />
                          <Route path="/app/editsubcategory/:categoryId" component={EditSubcategory} exact />
                          <Route path="/app/edittrip/:tripId" component={EditTrip} exact />

                          <Route path="/app/exportdata" component={ExportData} exact />
                          <Route path="/app/getpremium" component={GetPremium} exact />
                          <Route path="/app/help" component={HelpPage} exact />
                          <Route path="/app/logout" component={LogOut} exact />
                          <Route path="/app/logrecurrenceexpense/:seriesId" component={LogRecurrenceExpense} exact />

                          <Route path="/app/newaccount" component={NewAccount} exact />
                          <Route path="/app/newcategory" component={NewCategory} exact />
                          <Route path="/app/newexpense/:passedAccountId" component={NewExpense} exact />
                          <Route path="/app/newsubcategory/:categoryId" component={NewSubCategory} exact />
                          <Route path="/app/newtrip" component={NewTrip} exact />

                          <Route path="/app/otherperiods" component={OtherPeriods} exact />
                          <Route path="/app/profile" component={Profile} exact />
                          <Route path="/app/reccurrences" component={Reccurrences} exact />
                          <Route path="/app/settings" component={Settings} exact />

                          <Route
                            path="/app/statisticscategory/:categoryId/:year/:month"
                            component={StatisticsCategory}
                            exact
                          />
                          <Route path="/app/statistics" component={Statistics} exact />

                          <Route path="/app/themes" component={ThemePage} exact />
                          <Route path="/app/travelmode" component={TravelMode} exact />
                          <Route path="/app/viewtrip/:tripId" component={ViewTrip} exact />
                          <Route path="/app/viewrecurrence/:seriesId" component={ViewRecurrence} exact />

                          <Route path="/app/testpage" component={TestPage} exact />
                          <Route path="/app/splashscreen" component={SplashScreen} exact />
                        </IonRouterOutlet>
                      </IonSplitPane>
                    </TripProvider>
                  </IntervalProvider>
                </ExpenseProvider>
              </NumericKeypadProvider>
            </DatePickerProvider>
          </ExchangeRateProvider>
    </UserProvider>
  );
};

export default MainApp;