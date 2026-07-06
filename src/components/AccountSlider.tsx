import React, { useEffect, useMemo, useRef } from 'react';
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import SliderCard from './SliderCard';



// Styles
import '../Main.css';
import './AccountSlider.css';

interface AccountSliderProps {
  editAccount?: number; // In edit mode, holds expense's accountId
  accounts: any[]; // Array of accounts
  passedAccount?: number;
  onAccountSelect: (accountId: number) => void; // Callback to pass the selected account id to the parent
}

const AccountSlider: React.FC<AccountSliderProps> = ({ editAccount, accounts, onAccountSelect }) => {
  const swiperRef = useRef<any>(null);

  // Find the index of the editAccount in the accounts list
  const initialIndex = useMemo(() => {
    const index = accounts.findIndex(account => account.accountId === editAccount);
    return index !== -1 ? index : 0; // Ensure we don't return -1
  }, [accounts, editAccount]);


  useEffect(() => {
    // 1. If we are editing, select the editAccount
    if (accounts.length > 0 && editAccount) {
      onAccountSelect(editAccount);
      return;
    }

    // 2. If we are NOT editing, select the first account (sortOrder 0)
    if (accounts.length > 0 && !editAccount) {
        const firstAccount = accounts[0]?.accountId;
        if (firstAccount) {
            onAccountSelect(firstAccount);
        }
    }
  }, [accounts, editAccount, onAccountSelect]); 


  useEffect(() => {
    if (swiperRef.current && editAccount) {
      const index = accounts.findIndex(account => account.accountId === editAccount);
      if (index !== -1) {
        swiperRef.current.slideTo(index); // Update to correct slide
      }
    }
  }, [editAccount, accounts]);

  
  // Handle slide change to update selected card ID
  const handleSlideChange = (swiper: any) => {
    const activeIndex = swiper.activeIndex;
    const selectedCard = accounts[activeIndex]?.accountId;
    if (selectedCard) {
      onAccountSelect(selectedCard);
    }
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
        initialSlide={initialIndex} // Start at the correct slide
      >
        {accounts?.map((account) => (
          <SwiperSlide key={account.accountId}>
            <SliderCard   
              title={account.accountName}
              color={account.activeAccount ? account.accountColor : "neutral"}  
              identifier={account.accountIdentifier}
              logo={account.accountLogo}  
            />  
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default AccountSlider;
