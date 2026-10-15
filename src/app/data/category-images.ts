// 分类目录页图片 — 使用本地打包资源，避免 GitHub 外链 404

import aboutUsImg from 'figma:asset/category-about-us.webp';
import apparelImg from 'figma:asset/category-apparel.webp';
import stationeryImg from 'figma:asset/category-stationery.webp';
import giftImg from 'figma:asset/category-gift.webp';
import dailyUseImg from 'figma:asset/category-daily-use.webp';
import sportsImg from 'figma:asset/category-sports.webp';

export const categoryImages = {
  aboutus: aboutUsImg,
  apparel: apparelImg,
  stationery: stationeryImg,
  gift: giftImg,
  dailyUse: dailyUseImg,
  sports: sportsImg,
} as const;

export const categoryImageList = Object.values(categoryImages);
