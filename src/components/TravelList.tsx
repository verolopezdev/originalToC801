import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { db, Trip } from '../db'; 

// App components
import TravelItem from './TravelItem';

// Custom hooks
import { useTrip } from '../context/TripContext';

import {
    IonInfiniteScroll,
    IonInfiniteScrollContent,
} from '@ionic/react';
  

import {
  IonText
} from '@ionic/react';

interface TravelListProps {
  onTripCountChange?: (count: number) => void;
}


const TravelList: React.FC<TravelListProps> = ({ onTripCountChange }) => {  
  const { t } = useTranslation();
  
  const { checkTrip } = useTrip();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  const isLoadingRef = useRef(false); // Prevent multiple loads
  

  useEffect(() => {
    setTrips([]); // Reset trips when the dependencies change
    setOffset(0);
    setHasMore(true);
    loadInitial();
  }, [checkTrip]);

  const loadInitial = async () => {
    if (isLoadingRef.current) return; // meaning loadMore is running
    isLoadingRef.current = true; // Start loading

    const result = await fetchTrips(0);
    setTrips(result); // Initially load the expenses
    onTripCountChange?.(result.length); // Notify parent
    setOffset(result.length);
    setHasMore(result.length === PAGE_SIZE);

    isLoadingRef.current = false; // Done loading
  };

  const loadMore = async (e: CustomEvent<void>) => {
    if (isLoadingRef.current) {
      e.target && (e.target as HTMLIonInfiniteScrollElement).complete();
      return;
    }

    isLoadingRef.current = true;
    const result = await fetchTrips(offset);

    // Optional: delay the UI update by 1 second (1000ms)
    await new Promise(resolve => setTimeout(resolve, 1000));  

    setTrips(prev => [...prev, ...result]);

    setOffset(prev => prev + result.length);
    setHasMore(result.length === PAGE_SIZE);

    isLoadingRef.current = false;
    (e.target as HTMLIonInfiniteScrollElement).complete();
  };



  const fetchTrips = async (skip: number): Promise<Trip[]> => {
    const results = await db.trips
    .orderBy('fromDate') // sort by fromDate ascending
    .reverse()           // to get newest first (descending)
    .offset(skip)
    .limit(PAGE_SIZE)
    .toArray();

    /*
    Dexie stores data in IndexedDB, which means the expenseDate is stored as a string (because IndexedDB doesn't support Date objects directly).
    When we retrieve it, we convert expenseDate back to a real JavaScript Date object so you can use it in rendering, comparisons, etc.
    The ...exp spreads the rest of the fields into the object, so nothing else is lost.
    */
    return results.map(trip => ({
    ...trip,
    fromDate: new Date(trip.fromDate),
    toDate: new Date(trip.toDate)
    }));
  };
  

  
  return (
    <>
        {!isLoadingRef.current && (
          trips.length === 0 ? (
            <IonText className="ion-padding">{t('trip.no_trips_found')}</IonText>
          ) : (
            <>
              {trips.map((trip) => (
                <TravelItem 
                  key={trip.tripId}
                  tripId={trip.tripId}  
                  tripName={trip.tripName}
                  tripIcon={trip.tripIcon}
                  fromDate={trip.fromDate}
                  toDate={trip.toDate}
                  currencyCode={trip.currencyCode}
                />
              ))}
            </>
          ))
        }

        <IonInfiniteScroll
        threshold="100px" 
        onIonInfinite={loadMore}
        disabled={!hasMore}
        >
        <IonInfiniteScrollContent loadingText={t('common.loading_more')}></IonInfiniteScrollContent>
        </IonInfiniteScroll>
        
    </>
  );
};

export default TravelList;
