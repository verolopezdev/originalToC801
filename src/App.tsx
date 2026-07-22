import React from "react";

import { IonApp, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Redirect, Route } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeContext";
import { CurrencyProvider } from "./context/CurrencyContext";



import MainApp from "./MainApp";

import StartupRedirect from "./pages/StartupRedirect";
import WelcomeScreen from "./pages/WelcomeScreen";
import LoginScreen from "./pages/LoginScreen";
import CountrySelectionPage from "./pages/CountrySelectionPage";

/* Core CSS */
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

import "@ionic/react/css/palettes/dark.class.css";

import "./theme/variables.css";

import { ScreenOrientation } from "@capacitor/screen-orientation";

ScreenOrientation.lock({
  orientation: "portrait",
});

setupIonicReact();

const App: React.FC = () => {
  
  return (
    <IonApp>
      <ThemeProvider>
        <CurrencyProvider>
        
        <IonReactRouter>

          {/* Startup */}
          <Route exact path="/startup" component={StartupRedirect} />
          <Route exact path="/welcome" component={WelcomeScreen} />
          <Route exact path="/login" component={LoginScreen} />
          <Route exact path="/select-country" component={CountrySelectionPage} />

          {/* Main application */}
          <Route path="/app" component={MainApp} />

          {/* Default */}
          <Redirect exact from="/" to="/startup" />

        </IonReactRouter>
        </CurrencyProvider>
        
      </ThemeProvider>
    </IonApp>
  );
};

export default App;