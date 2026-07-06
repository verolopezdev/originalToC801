// dayjs.d.ts
import * as dayjs from 'dayjs';

declare module 'dayjs' {
  interface Dayjs {
    week(): number;
  }
}
