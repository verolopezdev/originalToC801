import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { db, Trip } from '../db';


// Define the context type
interface TripContextType {
  checkTrip: () => void; // Notifies TravelList that something changed in some trip, to show it again 
  activateTravelMode: boolean;
  setActivateTravelMode: (value: boolean) => void;
  travelMode: boolean;
  setTravelMode: (value: boolean) => void;
  selectedTripId: number | null;  
  setSelectedTripId: (tripId: number | null) => void;
  trips: Trip[];
  setTrips: (trips: Trip[]) => void;
} 

// Create the context
const TripContext = createContext<TripContextType | undefined>(undefined);

// Preference key
const TRAVEL_MODE_KEY = 'travelMode'; 
const SELECTED_TRIP_ID_KEY = 'selectedTripId';

export const TripProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [updateCounter, setUpdateCounter] = useState(0);  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoaded, setTripsLoaded] = useState<boolean>(false);
  const [activateTravelMode, setActivateTravelModeState] = useState(false);
  const [travelMode, setTravelModeState] = useState(false);
  const [selectedTripId, setSelectedTripIdState] = useState<number | null>(null);


  // Load persisted value on mount
  useEffect(() => {
    const loadPreferences = async () => {
      const travelModeResult = await Preferences.get({ key: TRAVEL_MODE_KEY });
      const tripIdResult = await Preferences.get({ key: SELECTED_TRIP_ID_KEY });

      if (travelModeResult.value !== null) {
        const parsedValue = JSON.parse(travelModeResult.value);
        setTravelModeState(parsedValue);
        setActivateTravelModeState(parsedValue);
      }

      if (tripIdResult.value !== null) {
        setSelectedTripIdState(JSON.parse(tripIdResult.value));
      }
    };
    loadPreferences();
  }, []);
  

  useEffect(() => {
    const fetchAll = async () => {
      const data = await db.trips.orderBy('fromDate').reverse().toArray();
      setTrips(data);
      setTripsLoaded(true);
    };
  
    fetchAll();
  }, [updateCounter]);


  const checkTrip = () => {
    setUpdateCounter(prev => prev + 1);
  };


  const setActivateTravelMode = async (value: boolean) => {
    setActivateTravelModeState(value);

    if (!value) {
      // If travel mode is turned off, clear the selected trip ID
      setSelectedTripIdState(null);
      await Preferences.remove({ key: SELECTED_TRIP_ID_KEY });
      await Preferences.set({ key: TRAVEL_MODE_KEY, value: JSON.stringify(value) });
      setTravelMode(false);
    }
  }

  // Wrap the setter to sync with Preferences
  const setTravelMode = async (value: boolean) => {
    setTravelModeState(value);
    await Preferences.set({ key: TRAVEL_MODE_KEY, value: JSON.stringify(value) });
  };

  const setSelectedTripId = async (tripId: number | null) => {
    setSelectedTripIdState(tripId);
    await Preferences.set({ key: SELECTED_TRIP_ID_KEY, value: JSON.stringify(tripId) });
  };


  return (
    <TripContext.Provider 
      value={{ 
        checkTrip, 
        activateTravelMode,
        setActivateTravelMode,
        travelMode, 
        setTravelMode, 
        selectedTripId, 
        setSelectedTripId,
        trips,
        setTrips 
      }}>
      {children}
    </TripContext.Provider>
  );
};

// Custom hook
export const useTrip = () => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
};
