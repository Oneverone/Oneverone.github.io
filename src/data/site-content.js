export const heroContent = {
  badge: 'For two hearts, one little universe',
  title: '把每一次心动，种进我们共同生活的光里。',
  subtitle: 'A soft little place for us',
  description:
    '这里收藏相遇的日期、习惯的晚安、想一起去看的海，也把平凡日子写成带着奶油粉和月光的纪念册。',
  primaryAction: {
    label: '翻看我们的相册',
    href: '#album',
  },
  secondaryAction: {
    label: '写给彼此的悄悄话',
    href: '#letters',
  },
}

function buildImageUrl(prompt, imageSize) {
  return `https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${imageSize}`
}

export const memoryStats = [
  {
    label: '今天我们在一起啦',
    value: '2019.02.02',
    note: '一束晚风和一句温柔招呼，成为故事开始的注脚。',
  },
  {
    label: '很高兴今天领证',
    value: '2024.05.24',
    note: '每一天的晚安、分享欲和偏爱，都在悄悄累积。',
  },
  {
    label: '执此之手与子偕老',
    value: '2025.12.31',
    note: '想一起做饭、看海、听雨，也想把平凡过成闪光。',
  },
]

export const vows = [
  '想把每一个平凡清晨，都过成有你在场的小节日。',
  '在忙碌世界里，为彼此留一盏始终温暖的灯。',
  '以后还有很多远方，但最心安的坐标一直是我们。',
]

export const albumPhotos = [
  {
    title: '海边晚风',
    note: '把日落和你一起收进镜头里。',
    moment: '17:42 PM',
    location: '青岛小麦岛',
    image: buildImageUrl(
      'romantic young couple holding hands on a seaside boardwalk at sunset, warm pastel sky, natural candid photography, soft wind in hair, cream pink tones, realistic editorial portrait, intimate and gentle atmosphere',
      'portrait_4_3',
    ),
  },
  {
    title: '花店约会',
    note: '一束玫瑰和一个对视，就足够让一天变甜。',
    moment: 'Weekend Date',
    location: '街角花房',
    image: buildImageUrl(
      'stylish romantic couple standing in a flower shop surrounded by blush roses and white peonies, soft daylight, realistic lifestyle photography, elegant outfits, cozy and dreamy mood',
      'portrait_16_9',
    ),
  },
  {
    title: '列车窗边',
    note: '去远方的时候，也在认真路过彼此。',
    moment: '08:16 AM',
    location: '清晨短途列车',
    image: buildImageUrl(
      'realistic romantic couple sitting together by a train window, morning sunlight streaming in, candid travel moment, soft beige and pink tones, cinematic lifestyle photography',
      'portrait_4_3',
    ),
  },
  {
    title: '夜色散步',
    note: '城市灯火很亮，可我只想看你。',
    moment: '22:09 PM',
    location: '江边步道',
    image: buildImageUrl(
      'romantic couple walking under city lights at night, gentle bokeh, realistic photography, warm coats, holding hands, moody but tender atmosphere, editorial quality',
      'landscape_4_3',
    ),
  },
  {
    title: '厨房小记',
    note: '平凡日子里，最喜欢和你一起准备晚餐。',
    moment: 'Home Diary',
    location: '暖光厨房',
    image: buildImageUrl(
      'realistic couple cooking together in a cozy modern kitchen, warm ambient lighting, flour on hands, intimate smile, soft romantic tones, lifestyle magazine photography',
      'portrait_4_3',
    ),
  },
  {
    title: '樱花时刻',
    note: '春天只是背景，主角一直是我们。',
    moment: 'Spring Bloom',
    location: '河畔樱花道',
    image: buildImageUrl(
      'romantic couple beneath blooming cherry blossoms, petals falling, realistic soft light portrait photography, pastel pink color palette, affectionate candid moment',
      'portrait_16_9',
    ),
  },
]

export const loveTimeline = [
  {
    date: '2023.02.14',
    title: '第一次认真心动',
    tag: '故事开始',
    note: '那天的晚风不算特别，可你说话时看过来的眼神，让平凡傍晚忽然变成了纪念日。',
  },
  {
    date: '2023.03.18',
    title: '第一次正式约会',
    tag: '城市散步',
    note: '一起在街角花店停留了很久，后来才发现，那束玫瑰像是替我们提前说了喜欢。',
  },
  {
    date: '2023.06.01',
    title: '第一次旅行出发',
    tag: '短途列车',
    note: '窗外景色一直在后退，但我们开始一起向前，路程也因此有了更柔软的意义。',
  },
  {
    date: '2023.08.25',
    title: '海边说了想要很久在一起',
    tag: '落日见证',
    note: '太阳慢慢沉进海平线的时候，我们把未来说得很轻，却第一次觉得它真实得可以触碰。',
  },
  {
    date: '2024.02.14',
    title: '一周年纪念日',
    tag: '365 天',
    note: '从一句晚安到许多个清晨，原来爱不是热烈一瞬，而是愿意把每一天都认真相待。',
  },
]

export const socialLinks = [
  {
    label: '影像日记',
    href: 'https://instagram.com',
    icon: 'Camera',
  },
  {
    label: '小纸条',
    href: 'mailto:hello@example.com',
    icon: 'Mail',
  },
  {
    label: '心愿清单',
    href: 'https://github.com',
    icon: 'NotebookTabs',
  },
]
