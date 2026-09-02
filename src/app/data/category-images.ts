// 分类目录页图片 — 使用本地打包资源，避免 GitHub 外链 404

import aboutUsImg from 'figma:asset/61b600464c10ad2f4fcf9d9d77c1d869e872c127.png';
import apparelImg from 'figma:asset/d42fdc6bcb5a6e9d0a49823104a2d6f3b5225722.png';
import stationeryImg from 'figma:asset/dc8073f8d24e7b789aeb66caf11741cc73b2d616.png';
import giftImg from 'figma:asset/d38bc22a74fde3d9a82439bd3d7aeda270de798c.png';
import dailyUseImg from 'figma:asset/737da13b16947dd686e7e6fda1be7cd3dd17ae96.png';
import sportsImg from 'figma:asset/7de16ac9b3eb56f7577a37846f121b0b78bf10fd.png';

export const categoryImages = {
  aboutus: aboutUsImg,
  apparel: apparelImg,
  stationery: stationeryImg,
  gift: giftImg,
  dailyUse: dailyUseImg,
  sports: sportsImg,
} as const;

export const categoryImageList = Object.values(categoryImages);
