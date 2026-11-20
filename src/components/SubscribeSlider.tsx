import React, { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Ionic components
import {
  IonIcon,
} from '@ionic/react';

import {
  airplaneOutline,
  arrowForwardOutline,
  cashOutline,
  peopleOutline,
  repeatOutline,
} from 'ionicons/icons';

import { useNativeAds } from '../context/NativeAdProvider';

import SubscribeCard from './SubscribeCard';
import PremiumFeaturesModal from './Modals/PremiumFeaturesModal';

import 'swiper/css';
import 'swiper/css/pagination';
import './SubscribeSlider.css';

interface SubscribeItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  accentColor: string;
  cardGradientVar: string; // e.g. 'var(--red)'
}

const DEFAULT_PROMO_ITEMS: SubscribeItem[] = [
  {
    id: 'travel-mode',
    title: 'Travel Mode',
    description: 'Keep your vacation spending organized in a dedicated space while on the go.',
    icon: airplaneOutline,
    accentColor: '#2b8cff',
    cardGradientVar: 'var(--blue, #2b8cff)',
  },
  {
    id: 'multi-currency',
    title: 'Multi-Currency',
    description: 'Manage expenses in different currencies with automatic, up-to-date conversion.',
    icon: cashOutline,
    accentColor: '#34c759',
    cardGradientVar: 'var(--green, #34c759)',
  },
  {
    id: 'recurrent-expenses',
    title: 'Recurring Expenses',
    description: 'Automate your monthly fixed bills and never miss a payment in your budget.',
    icon: repeatOutline,
    accentColor: '#ff9500',
    cardGradientVar: 'var(--orange, #ff9500)',
  },
  {
    id: 'shared-subscription',
    title: 'Shared Subscription',
    description: 'Share premium benefits with the person you split your expenses with.',
    icon: peopleOutline,
    accentColor: '#af52de',
    cardGradientVar: 'var(--red,rgb(222, 82, 82))',
  },
];


interface SubscribeSliderProps {
  items?: SubscribeItem[];
  initialIndex?: number;
  onSlideChange?: (activeIndex: number) => void;
  onCardClick?: (item: SubscribeItem) => void;
}

export const SubscribeSlider: React.FC<SubscribeSliderProps> = ({
  items = DEFAULT_PROMO_ITEMS,
  initialIndex = 0,
  onSlideChange,
  onCardClick,
}) => {
  const swiperRef = useRef<SwiperType | null>(null);
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState(false);
  const { pauseAll, resumeAll } = useNativeAds();

  const handleSlideChange = (swiper: SwiperType) => {
    onSlideChange?.(swiper.activeIndex);
  };

  return (
    <section>
      <div className='section-header-flex'>
        <h6 className="section-title section-title-flex">Premium features</h6>
        <button
          type="button"
          className="section-link"
          onClick={async () => {
            await pauseAll();
            setIsFeaturesModalOpen(true);
          }}
        >
          View All 
          <IonIcon icon={arrowForwardOutline} />
        </button>

        <PremiumFeaturesModal
          isOpen={isFeaturesModalOpen}
          onDidDismiss={() => {
            setIsFeaturesModalOpen(false);
            resumeAll();
          }}
        />
      </div>

      <div
        className="subscribe-slider"
        style={{ marginBottom: items.length > 1 ? 40 : 20 }}
      >
        <Swiper
          onSwiper={(swiper) => (swiperRef.current = swiper)}
          spaceBetween={12}
          slidesPerView={1.12}
          centeredSlides={true}
          speed={400}
          pagination={items.length > 1 ? { clickable: true } : false}
          modules={[Pagination]}
          onSlideChange={handleSlideChange}
          initialSlide={initialIndex}
        >
          {items.map((item) => (
            <SwiperSlide key={item.id}>
              <SubscribeCard
                title={item.title}
                description={item.description}
                icon={item.icon}
                accentColor={item.accentColor}
                onClick={() => onCardClick?.(item)}
                cardGradientVar={item.cardGradientVar}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

    </section>
  );
};