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


import SubscribeCard from './SubscribeCard';
import PremiumFeaturesModal from './Modals/PremiumFeaturesModal';

import 'swiper/css';
import 'swiper/css/pagination';
import './SubscribeSlider.css';

interface SubscribeItem {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: string;
  cardGradientVar: string; // e.g. 'var(--red)'
}

const DEFAULT_PROMO_ITEMS: SubscribeItem[] = [
  {
    id: 'travel-mode',
    title: 'Travel Mode',
    description: 'Keep your vacation spending organized in a dedicated space while on the go.',
    route: '/app/travelmode',
    icon: airplaneOutline,
    cardGradientVar: 'var(--blue, #00509d)',
  },
  {
    id: 'multi-currency',
    title: 'Multi-Currency',
    description: 'Manage expenses in different currencies with automatic, up-to-date conversion.',
    route: '/app/currency',
    icon: cashOutline,
    cardGradientVar: 'var(--green, #008800)',
  },
  {
    id: 'recurrent-expenses',
    title: 'Recurring Expenses',
    description: 'Automate your monthly fixed bills and never miss a payment in your budget.',
    route: '/app/reccurrences',
    icon: repeatOutline,
    cardGradientVar: 'var(--orange, #FF6A00)',
  },
  {
    id: 'shared-subscription',
    title: 'Shared Subscription',
    description: 'Share premium benefits with the person you split your expenses with.',
    route: '/app/getpremium',
    icon: peopleOutline,
    cardGradientVar: 'var(--red, #cd1c18)',
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
                route={item.route}
                cardGradientVar={item.cardGradientVar}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

    </section>
  );
};