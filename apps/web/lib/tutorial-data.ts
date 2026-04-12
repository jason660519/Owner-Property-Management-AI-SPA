// Tutorial content data for company product tutorial feature
// Organized by role: landlord (房東), tenant (租客), buyer (買家)

export type TutorialRole = 'landlord' | 'tenant' | 'buyer';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  mediaType: 'screenshot' | 'video' | 'none';
  /** Relative path or URL to screenshot/video asset */
  mediaSrc?: string;
  mediaAlt?: string;
  /** Duration in seconds for video steps */
  videoDurationSec?: number;
  /** Internal link to the related feature page */
  featureLink?: string;
  featureLinkLabel?: string;
}

export interface TutorialRoleConfig {
  role: TutorialRole;
  label: string;
  icon: string;
  description: string;
  steps: TutorialStep[];
}

export const TUTORIAL_ROLES: TutorialRole[] = ['landlord', 'tenant', 'buyer'];

export const TUTORIAL_DATA: Record<TutorialRole, TutorialRoleConfig> = {
  landlord: {
    role: 'landlord',
    label: '房東版',
    icon: '🏠',
    description: '了解如何以房東身份在 Owner AI 管理物件、追蹤租客與處理租約。',
    steps: [
      {
        id: 'landlord-01',
        title: '建立帳號與選擇角色',
        description:
          '完成註冊後，在角色選擇頁選擇「房東」。系統會引導你進入房東儀表板，集中管理所有出租物件。',
        mediaType: 'screenshot',
        mediaSrc: '/tutorial/screenshots/landlord-01-register.png',
        mediaAlt: '角色選擇畫面截圖',
        featureLink: '/register',
        featureLinkLabel: '立即註冊',
      },
      {
        id: 'landlord-02',
        title: '刊登出租物件',
        description:
          '在「我的物件」頁面點擊「新增物件」，填寫基本資訊（坪數、租金、押金）並上傳照片。AI 助理可自動生成物件說明文案。',
        mediaType: 'screenshot',
        mediaSrc: '/tutorial/screenshots/landlord-02-add-property.png',
        mediaAlt: '新增物件表單截圖',
        featureLink: '/landlord/add-property',
        featureLinkLabel: '新增物件',
      },
      {
        id: 'landlord-03',
        title: '管理帶看與詢問',
        description:
          '租客提出看屋申請後，系統會即時通知。你可在儀表板確認時間、拒絕或改期，並記錄帶看結果。',
        mediaType: 'screenshot',
        mediaSrc: '/tutorial/screenshots/landlord-03-viewings.png',
        mediaAlt: '帶看管理畫面截圖',
        featureLink: '/(dashboard)/landlord/dashboard',
        featureLinkLabel: '前往儀表板',
      },
      {
        id: 'landlord-04',
        title: '追蹤租約與點交進度',
        description:
          '簽約後，系統自動進入「租約管理」階段。你可以看到租金繳交記錄、維修申請與點交待辦清單，全程數位化追蹤。',
        mediaType: 'screenshot',
        mediaSrc: '/tutorial/screenshots/landlord-04-contract.png',
        mediaAlt: '租約追蹤畫面截圖',
        featureLink: '/(dashboard)/landlord/dashboard',
        featureLinkLabel: '查看儀表板',
      },
    ],
  },
  tenant: {
    role: 'tenant',
    label: '租客版',
    icon: '🔑',
    description: '了解如何以租客身份在 Owner AI 搜尋物件、安排看屋與追蹤租約。',
    steps: [
      {
        id: 'tenant-01',
        title: '搜尋合適物件',
        description:
          '在物件列表頁輸入地區、租金範圍與需求條件，快速找到符合條件的出租物件。每個物件都有詳細資訊與 AI 整理的重點摘要。',
        mediaType: 'screenshot',
        mediaSrc: '/tutorial/screenshots/tenant-01-search.png',
        mediaAlt: '物件搜尋頁面截圖',
        featureLink: '/properties',
        featureLinkLabel: '瀏覽物件',
      },
      {
        id: 'tenant-02',
        title: '申請看屋',
        description:
          '在物件頁面點擊「申請看屋」，選擇可看屋時段並填寫基本資訊。房東確認後，系統會發送通知並加入你的日曆。',
        mediaType: 'screenshot',
        mediaSrc: '/tutorial/screenshots/tenant-02-viewing.png',
        mediaAlt: '申請看屋表單截圖',
        featureLink: '/properties',
        featureLinkLabel: '找物件看屋',
      },
      {
        id: 'tenant-03',
        title: '追蹤租約狀態',
        description:
          '入住後在「我的租約」頁面查看租金繳交記錄、提出維修申請與查看點交清單。所有租約文件均可在平台下載。',
        mediaType: 'screenshot',
        mediaSrc: '/tutorial/screenshots/tenant-03-contract.png',
        mediaAlt: '租約追蹤頁面截圖',
        featureLink: '/(dashboard)/tenant/dashboard',
        featureLinkLabel: '前往儀表板',
      },
    ],
  },
  buyer: {
    role: 'buyer',
    label: '買家版',
    icon: '🏡',
    description: '了解如何以買家身份在 Owner AI 找屋、追蹤案件與協作代書過戶。',
    steps: [
      {
        id: 'buyer-01',
        title: '建立買家偏好',
        description:
          '完成註冊後選擇「買家」角色，設定目標地區、預算與物件條件。系統會根據偏好推薦符合需求的物件，並在新物件上架時通知你。',
        mediaType: 'screenshot',
        mediaSrc: '/tutorial/screenshots/buyer-01-preferences.png',
        mediaAlt: '買家偏好設定截圖',
        featureLink: '/register',
        featureLinkLabel: '立即註冊',
      },
      {
        id: 'buyer-02',
        title: '瀏覽物件與詢問',
        description:
          '物件頁面提供謄本摘要、地段分析與 AI 整理的重點問題。你可以直接在平台向賣方或仲介詢問，所有對話記錄完整保留。',
        mediaType: 'screenshot',
        mediaSrc: '/tutorial/screenshots/buyer-02-properties.png',
        mediaAlt: '物件瀏覽頁面截圖',
        featureLink: '/properties',
        featureLinkLabel: '瀏覽物件',
      },
      {
        id: 'buyer-03',
        title: '追蹤要約與斡旋金',
        description:
          '提出要約後在「案件追蹤」頁面查看斡旋金狀態、雙方意願進度與合約版本。AI 助理會摘要關鍵條款與風險。',
        mediaType: 'screenshot',
        mediaSrc: '/tutorial/screenshots/buyer-03-offer.png',
        mediaAlt: '要約追蹤頁面截圖',
        featureLink: '/(dashboard)/buyer/dashboard',
        featureLinkLabel: '前往儀表板',
      },
      {
        id: 'buyer-04',
        title: '代書過戶協作',
        description:
          '進入過戶階段後，代書加入案件。你可以在同一畫面追蹤謄本補件、履約保證里程碑與最終交屋清單，不再需要 LINE 催件。',
        mediaType: 'screenshot',
        mediaSrc: '/tutorial/screenshots/buyer-04-transfer.png',
        mediaAlt: '過戶協作頁面截圖',
        featureLink: '/(dashboard)/buyer/contracted/dashboard',
        featureLinkLabel: '查看案件進度',
      },
    ],
  },
};

export const ROLE_LABELS: Record<TutorialRole, string> = {
  landlord: '房東',
  tenant: '租客',
  buyer: '買家',
};

/** Total step count for a given role */
export function getTotalSteps(role: TutorialRole): number {
  return TUTORIAL_DATA[role].steps.length;
}
