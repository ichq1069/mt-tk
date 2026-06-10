export const MOCK_ADS = [
  {
    id: 'ad-1',
    title: '极速摄影工作坊',
    description: '由行业顶尖导师授课，解锁专业后期处理与光影捕捉技巧。',
    imageUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_3ef86879-1795-4e97-97a4-16cb7183bac3.jpg',
    ctaText: '立即报名',
    ctaUrl: 'https://example.com/workshop',
    category: '学习'
  },
  {
    id: 'ad-2',
    title: '索尼 A7R 系列限时特惠',
    description: '高达 6100 万像素，捕捉极致细节。现在购买即享 12 期免息。',
    imageUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_a6f08fc0-adb3-440a-9362-5c1b8f3e96ca.jpg',
    ctaText: '查看详情',
    ctaUrl: 'https://sony.com/alpha',
    category: '数码'
  },
  {
    id: 'ad-3',
    title: 'Adobe Creative Cloud',
    description: '借助全新的 Firefly AI 工具，让你的创意瞬间变为现实。',
    imageUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_33f0feec-028b-4b00-a321-50432145ed78.jpg',
    ctaText: '免费试用',
    ctaUrl: 'https://adobe.com/creativecloud',
    category: '工具'
  },
  {
    id: 'ad-4',
    title: '发现隐藏的马尔代夫',
    description: '远离喧嚣，在私人海岛享受纯净的假期体验。早鸟预订 7 折。',
    imageUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_8daf6478-f654-4659-b0cb-19c18618519a.jpg',
    ctaText: '探索目的地',
    ctaUrl: 'https://travel.com/maldives',
    category: '旅行'
  }
];

export const getRandomAd = () => {
  return MOCK_ADS[Math.floor(Math.random() * MOCK_ADS.length)];
};
