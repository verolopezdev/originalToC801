import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import SliderTotalCard from './SliderTotalCard';
import { useTheme } from '../theme/ThemeContext';
import dayjs, { Dayjs } from "dayjs";



// Styles
import '../Main.css';
import './AccountSlider.css';

interface AccountTotalSliderProps {
  accounts: any[]; // Array of accounts
  onAccountSelect: (accountId: string) => void; // Callback to pass the selected account id to the parent
  currentDate: Dayjs; // Pass currentDate from parent
  selectedInterval: "weekly" | "monthly" | "yearly";
  setSelectedInterval: (interval: "weekly" | "monthly" | "yearly") => void;
  start: Dayjs; 
  end: Dayjs;   
}

const AccountTotalSlider: React.FC<AccountTotalSliderProps> = ({ 
  accounts, 
  onAccountSelect,
  currentDate,
  selectedInterval, 
  setSelectedInterval, 
  start,
  end
 }) => {
  const { t } = useTranslation();
  const swiperRef = useRef<any>(null);
  const { themeColor } = useTheme(); // theme-yellow
  

  // Prepend new account Total Expenses to account array
  const modifiedAccounts = useMemo(() => {  
    const color = themeColor.split("-")[1]; // Extracts "red"
    
    return [
      {
        accountId: 0, // Unique ID for Total Expenses
        accountName: t('accounts.total_expenses'),  
        accountColor: color, // Default color, adjust as needed
        accountIdentifier: "",
        accountLogo: "",
        activeAccount: true,
      },
      ...accounts,
    ];
  }, [accounts]);

  

  // Handle slide change to update selected card ID
  const handleSlideChange = (swiper: any) => {
    const activeIndex = swiper.activeIndex;
    const selectedCard = modifiedAccounts[activeIndex]?.accountId;
    onAccountSelect(selectedCard);
  };

  
  
  return (
    <div className="expense-slider">
      <Swiper
        onSwiper={(swiper) => (swiperRef.current = swiper)} // Save swiper instance
        spaceBetween={2}
        slidesPerView={1.1}
        centeredSlides={true}
        speed={400}
        pagination={{ clickable: true }}
        modules={[Pagination]}
        onSlideChange={handleSlideChange}
      >
        {modifiedAccounts?.map((account) => (
          <SwiperSlide key={account.accountId}>
            <SliderTotalCard          
              title={account.accountName}
              color={account.activeAccount ? account.accountColor : "neutral"}
              identifier={account.accountIdentifier}
              logo={account.accountLogo}
              selectedInterval={selectedInterval} 
              setSelectedInterval={setSelectedInterval} 
              currentDate={currentDate}
              accountId={account.accountId}
              start={start}
              end={end}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default AccountTotalSlider;
