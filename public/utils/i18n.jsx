const RH_SUPPORTED_LOCALES = Object.freeze(['zh-Hans', 'zh-Hant', 'en', 'ja']);
const RH_DEFAULT_LOCALE = 'zh-Hans';
const RH_INTL_LOCALE_MAP = Object.freeze({
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
  en: 'en-US',
  ja: 'ja-JP',
});
const RH_LOCALE_NATIVE_LABELS = Object.freeze({
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  en: 'English',
  ja: '日本語',
});

const RH_STATIC_TRANSLATIONS = {
  'zh-Hant': {},
  en: {},
  ja: {},
};

const RH_PATTERN_TRANSLATORS = [
  {
    test: /^成功添加 (\d+) 条资源$/,
    render(locale, match) {
      const count = match[1];
      if (locale === 'zh-Hant') return `成功新增 ${count} 筆資源`;
      if (locale === 'en') return `Successfully added ${count} resources`;
      if (locale === 'ja') return `${count} 件のリソースを追加しました`;
      return match[0];
    },
  },
  {
    test: /^成功 (\d+) 条，失败 (\d+) 条$/,
    render(locale, match) {
      const successCount = match[1];
      const failCount = match[2];
      if (locale === 'zh-Hant') return `成功 ${successCount} 筆，失敗 ${failCount} 筆`;
      if (locale === 'en') return `${successCount} succeeded, ${failCount} failed`;
      if (locale === 'ja') return `${successCount} 件成功、${failCount} 件失敗`;
      return match[0];
    },
  },
  {
    test: /^已删除 (\d+) 个标签$/,
    render(locale, match) {
      const count = match[1];
      if (locale === 'zh-Hant') return `已刪除 ${count} 個標籤`;
      if (locale === 'en') return `Deleted ${count} tags`;
      if (locale === 'ja') return `${count} 個のタグを削除しました`;
      return match[0];
    },
  },
  {
    test: /^标签「(.+)」已删除$/,
    render(locale, match) {
      const tag = match[1];
      if (locale === 'zh-Hant') return `標籤「${tag}」已刪除`;
      if (locale === 'en') return `Tag "${tag}" deleted`;
      if (locale === 'ja') return `タグ「${tag}」を削除しました`;
      return match[0];
    },
  },
  {
    test: /^重置密码 — (.+)$/,
    render(locale, match) {
      const name = match[1];
      if (locale === 'zh-Hant') return `重設密碼 — ${name}`;
      if (locale === 'en') return `Reset Password — ${name}`;
      if (locale === 'ja') return `パスワード再設定 — ${name}`;
      return match[0];
    },
  },
  {
    test: /^已重置 (.+) 的密码，临时密码已发送至邮箱$/,
    render(locale, match) {
      const name = match[1];
      if (locale === 'zh-Hant') return `已重設 ${name} 的密碼，臨時密碼已寄送至信箱`;
      if (locale === 'en') return `${name}'s password was reset and a temporary password was emailed`;
      if (locale === 'ja') return `${name} のパスワードを再設定し、一時パスワードをメール送信しました`;
      return match[0];
    },
  },
  {
    test: /^确认删除类别「(.+)」？关联的 (\d+) 个资源将失去类别归属。删除后不可恢复。$/,
    render(locale, match) {
      const name = match[1];
      const count = match[2];
      if (locale === 'zh-Hant') return `確認刪除類別「${name}」？關聯的 ${count} 個資源將失去類別歸屬。刪除後無法復原。`;
      if (locale === 'en') return `Delete category "${name}"? ${count} linked resources will lose their category. This cannot be undone.`;
      if (locale === 'ja') return `カテゴリ「${name}」を削除しますか？関連する ${count} 件のリソースからカテゴリが外れます。この操作は元に戻せません。`;
      return match[0];
    },
  },
  {
    test: /^确认删除类别「(.+)」？删除后不可恢复。$/,
    render(locale, match) {
      const name = match[1];
      if (locale === 'zh-Hant') return `確認刪除類別「${name}」？刪除後無法復原。`;
      if (locale === 'en') return `Delete category "${name}"? This cannot be undone.`;
      if (locale === 'ja') return `カテゴリ「${name}」を削除しますか？この操作は元に戻せません。`;
      return match[0];
    },
  },
  {
    test: /^确认删除标签「(.+)」？该标签将从所有资源中移除。$/,
    render(locale, match) {
      const tag = match[1];
      if (locale === 'zh-Hant') return `確認刪除標籤「${tag}」？該標籤將從所有資源中移除。`;
      if (locale === 'en') return `Delete tag "${tag}"? It will be removed from all resources.`;
      if (locale === 'ja') return `タグ「${tag}」を削除しますか？すべてのリソースから外れます。`;
      return match[0];
    },
  },
  {
    test: /^确认删除选中的 (\d+) 个标签？这些标签将从所有资源中移除。$/,
    render(locale, match) {
      const count = match[1];
      if (locale === 'zh-Hant') return `確認刪除選中的 ${count} 個標籤？這些標籤將從所有資源中移除。`;
      if (locale === 'en') return `Delete ${count} selected tags? They will be removed from all resources.`;
      if (locale === 'ja') return `選択した ${count} 個のタグを削除しますか？すべてのリソースから外れます。`;
      return match[0];
    },
  },
  {
    test: /^确认删除用户「(.+)」？该操作不可撤销，其名下资源将转移给当前管理员。$/,
    render(locale, match) {
      const name = match[1];
      if (locale === 'zh-Hant') return `確認刪除使用者「${name}」？此操作無法撤銷，其名下資源將轉移給目前管理員。`;
      if (locale === 'en') return `Delete user "${name}"? This cannot be undone, and their resources will be transferred to the current admin.`;
      if (locale === 'ja') return `ユーザー「${name}」を削除しますか？この操作は元に戻せず、所有リソースは現在の管理者へ移管されます。`;
      return match[0];
    },
  },
  {
    test: /^(\d+) 个结果$/,
    render(locale, match) {
      const count = match[1];
      if (locale === 'zh-Hant') return `${count} 個結果`;
      if (locale === 'en') return `${count} results`;
      if (locale === 'ja') return `${count} 件`;
      return match[0];
    },
  },
  {
    test: /^(\d+) 条记录$/,
    render(locale, match) {
      const count = match[1];
      if (locale === 'zh-Hant') return `${count} 筆紀錄`;
      if (locale === 'en') return `${count} records`;
      if (locale === 'ja') return `${count} 件の記録`;
      return match[0];
    },
  },
  {
    test: /^访问 (\d+)$/,
    render(locale, match) {
      const count = match[1];
      if (locale === 'zh-Hant') return `訪問 ${count}`;
      if (locale === 'en') return `${count} visits`;
      if (locale === 'ja') return `アクセス ${count}`;
      return match[0];
    },
  },
  {
    test: /^范围 · (.+)$/,
    render(locale, match) {
      const label = match[1];
      if (locale === 'zh-Hant') return `範圍 · ${label}`;
      if (locale === 'en') return `Scope · ${label}`;
      if (locale === 'ja') return `範囲 · ${label}`;
      return match[0];
    },
  },
  {
    test: /^类别 · (.+)$/,
    render(locale, match) {
      const label = match[1];
      if (locale === 'zh-Hant') return `類別 · ${label}`;
      if (locale === 'en') return `Category · ${label}`;
      if (locale === 'ja') return `カテゴリ · ${label}`;
      return match[0];
    },
  },
  {
    test: /^搜索 · (.+)$/,
    render(locale, match) {
      const label = match[1];
      if (locale === 'zh-Hant') return `搜尋 · ${label}`;
      if (locale === 'en') return `Search · ${label}`;
      if (locale === 'ja') return `検索 · ${label}`;
      return match[0];
    },
  },
  {
    test: /^(.+) · 已应用 (\d+) 组条件$/,
    render(locale, match) {
      const label = translateText(locale, match[1]);
      const count = match[2];
      if (locale === 'zh-Hant') return `${label} · 已套用 ${count} 組條件`;
      if (locale === 'en') return `${label} · ${count} filter groups applied`;
      if (locale === 'ja') return `${label} · ${count} 件の条件を適用中`;
      return match[0];
    },
  },
  {
    test: /^(\d+) 个资源可直接访问，覆盖 (\d+) 个分类$/,
    render(locale, match) {
      const resourceCount = match[1];
      const categoryCount = match[2];
      if (locale === 'zh-Hant') return `${resourceCount} 個資源可直接存取，涵蓋 ${categoryCount} 個分類`;
      if (locale === 'en') return `${resourceCount} resources ready to open across ${categoryCount} categories`;
      if (locale === 'ja') return `${resourceCount} 件のリソースに直接アクセス可能、${categoryCount} カテゴリをカバー`;
      return match[0];
    },
  },
  {
    test: /^(\d+) 个公开资源，覆盖 (\d+) 个分类$/,
    render(locale, match) {
      const resourceCount = match[1];
      const categoryCount = match[2];
      if (locale === 'zh-Hant') return `${resourceCount} 個公開資源，涵蓋 ${categoryCount} 個分類`;
      if (locale === 'en') return `${resourceCount} public resources across ${categoryCount} categories`;
      if (locale === 'ja') return `${resourceCount} 件の公開リソース、${categoryCount} カテゴリをカバー`;
      return match[0];
    },
  },
  {
    test: /^(\d+) 项$/,
    render(locale, match) {
      const count = match[1];
      if (locale === 'zh-Hant') return `${count} 項`;
      if (locale === 'en') return `${count} items`;
      if (locale === 'ja') return `${count} 件`;
      return match[0];
    },
  },
  {
    test: /^(\d+) 个分类$/,
    render(locale, match) {
      const count = match[1];
      if (locale === 'zh-Hant') return `${count} 個分類`;
      if (locale === 'en') return `${count} categories`;
      if (locale === 'ja') return `${count} カテゴリ`;
      return match[0];
    },
  },
  {
    test: /^展开更多 ?\((\d+)\)$/,
    render(locale, match) {
      const count = match[1];
      if (locale === 'zh-Hant') return `展開更多（${count}）`;
      if (locale === 'en') return `Show More (${count})`;
      if (locale === 'ja') return `さらに表示 (${count})`;
      return match[0];
    },
  },
  {
    test: /^批量删除 ?\((\d+)\)$/,
    render(locale, match) {
      const count = match[1];
      if (locale === 'zh-Hant') return `批量刪除（${count}）`;
      if (locale === 'en') return `Batch Delete (${count})`;
      if (locale === 'ja') return `一括削除 (${count})`;
      return match[0];
    },
  },
];

Object.assign(RH_STATIC_TRANSLATIONS['zh-Hant'], {
  '浅色': '淺色',
  '跟随系统': '跟隨系統',
  '登录': '登入',
  '个人信息': '個人資訊',
  '修改密码': '修改密碼',
  '后台管理': '後台管理',
  '注销登录': '登出',
  '搜索资源...': '搜尋資源...',
  '搜索资源名称、描述、标签... (Ctrl+K)': '搜尋資源名稱、描述、標籤... (Ctrl+K)',
  '加载中…': '載入中…',
  '确认删除': '確認刪除',
  '模拟邮件（开发预览）': '模擬郵件（開發預覽）',
  '主题：': '主旨：',
  '忘记密码': '忘記密碼',
  '登录账号': '登入帳號',
  '用户名': '使用者名稱',
  '请输入用户名': '請輸入使用者名稱',
  '密码': '密碼',
  '请输入密码': '請輸入密碼',
  '隐藏密码': '隱藏密碼',
  '显示密码': '顯示密碼',
  '登录中...': '登入中...',
  '如无法登录或注册，请联系管理员确认账号与注册策略。': '如無法登入或註冊，請聯絡管理員確認帳號與註冊策略。',
  '忘记密码？': '忘記密碼？',
  '没有账号？': '沒有帳號？',
  '注册账号': '註冊帳號',
  '注册成功！初始密码已发送至邮箱': '註冊成功！初始密碼已寄送至信箱',
  '注册失败': '註冊失敗',
  '注册功能暂未开放': '註冊功能尚未開放',
  '去登录': '前往登入',
  '邀请与注册': '邀請與註冊',
  '已有账号？': '已有帳號？',
  '返回登录': '返回登入',
  '发送重置链接': '發送重設連結',
  '账号恢复': '帳號恢復',
  '输入注册邮箱，系统将发送密码重置链接': '輸入註冊信箱，系統將發送密碼重設連結',
  '若该邮箱已注册，重置链接已发送，请查收': '若此信箱已註冊，重設連結已寄出，請查收',
  '密码已重置，请登录': '密碼已重設，請登入',
  '重置失败': '重設失敗',
  '链接已失效或过期': '連結已失效或過期',
  '请重新发送密码重置链接': '請重新發送密碼重設連結',
  '重新发送重置链接': '重新發送重設連結',
  '重置密码': '重設密碼',
  '设置新密码': '設定新密碼',
  '新密码': '新密碼',
  '确认新密码': '確認新密碼',
  '至少8位，含字母和数字': '至少 8 位，含字母與數字',
  '再次输入新密码': '再次輸入新密碼',
  '再次输入密码': '再次輸入密碼',
  '初始化成功！请登录': '初始化成功！請登入',
  '初始化失败': '初始化失敗',
  '首次初始化': '首次初始化',
  '欢迎使用资源导航系统': '歡迎使用資源導航系統',
  '请先完成初始化，创建管理员账号': '請先完成初始化，建立管理員帳號',
  '管理员用户名': '管理員使用者名稱',
  '管理员显示名称': '管理員顯示名稱',
  '管理员邮箱': '管理員信箱',
  '管理员密码': '管理員密碼',
  '确认密码': '確認密碼',
  '显示给其他用户的名称': '顯示給其他使用者的名稱',
  '完成初始化': '完成初始化',
  '更顺手地进入你的': '更順手地進入你的',
  '统一入口与常用访问能力，从这里开始。': '統一入口與常用存取能力，從這裡開始。',
  '资源管理': '資源管理',
  '公开与私有资源统一进入，常用内容不再分散。': '公開與私有資源統一進入，常用內容不再分散。',
  '快速切换': '快速切換',
  '收藏、最近访问与我创建的内容都能快速回到手边。': '收藏、最近訪問與我建立的內容都能快速回到手邊。',
  '后台配置': '後台配置',
  '管理员可直接进入系统配置与邮件服务管理。': '管理員可直接進入系統配置與郵件服務管理。',
  '常用入口能力': '常用入口能力',
  '登录后可直接访问的核心能力': '登入後可直接存取的核心能力',
  '资源导航': '資源導航',
  '我的收藏': '我的收藏',
  '最近访问': '最近訪問',
  '我创建的': '我建立的',
  '按热度': '按熱度',
  '按创建时间': '按建立時間',
  '按更新时间': '按更新時間',
  '卡片视图': '卡片視圖',
  '列表视图': '列表視圖',
  '时间轴视图': '時間軸視圖',
  '全部资源': '全部資源',
  '公开资源': '公開資源',
  '总访问量': '總訪問量',
  '近30日访问': '近 30 日訪問',
  '近24小时访问': '近 24 小時訪問',
  '浏览全部资源': '瀏覽全部資源',
  '可见资源': '可見資源',
  '当前可访问入口': '目前可存取入口',
  '资源分类': '資源分類',
  '按主题浏览入口': '依主題瀏覽入口',
  '我的资源': '我的資源',
  '我创建与维护的内容': '我建立與維護的內容',
  '页面累计访问量': '頁面累計訪問量',
  '近 30 天记录': '近 30 天紀錄',
  '最近一天活跃': '最近一天活躍',
  '无需登录即可访问': '無需登入即可存取',
  '常用标签': '常用標籤',
  '作为补充过滤条件': '作為補充篩選條件',
  '快速回到常用资源': '快速回到常用資源',
  '还没有收藏资源，先去逛逛并添加常用入口': '還沒有收藏資源，先去逛逛並加入常用入口',
  '继续上次浏览路径': '延續上次瀏覽路徑',
  '还没有访问记录，先随便逛一逛': '還沒有訪問紀錄，先隨意逛一逛',
  '维护自己的内容': '維護自己的內容',
  '还没有创建内容，可以尝试新增一个资源': '還沒有建立內容，可以先新增一個資源',
  '快捷入口': '快捷入口',
  '从收藏、历史或我的资源继续浏览和维护内容。': '從收藏、歷史或我的資源繼續瀏覽與維護內容。',
  '分类入口': '分類入口',
  '按主题快速浏览全部资源。': '按主題快速瀏覽全部資源。',
  '查看更多': '查看更多',
  '全部': '全部',
  '全部可见资源': '全部可見資源',
  '公开资源浏览': '公開資源瀏覽',
  '返回首页概览': '返回首頁總覽',
  '暂无数据': '暫無資料',
  '点击进入该分类结果页': '點擊進入此分類結果頁',
  '按访问热度挑选常用入口。': '按訪問熱度挑選常用入口。',
  '快速查看最近维护或新增的内容。': '快速查看最近維護或新增的內容。',
  '继续维护你创建和拥有的资源。': '繼續維護你建立與擁有的資源。',
  '热门资源': '熱門資源',
  '最近更新': '最近更新',
  '新增资源': '新增資源',
  '筛选': '篩選',
  '按创建时间归档': '按建立時間歸檔',
  '清空': '清空',
  '清空筛选': '清空篩選',
  '类别筛选结果': '類別篩選結果',
  '范围筛选结果': '範圍篩選結果',
  '搜索结果': '搜尋結果',
  '标签筛选结果': '標籤篩選結果',
  '筛选结果': '篩選結果',
  '类别过滤': '類別篩選',
  '标签筛选': '標籤篩選',
  '收起标签': '收起標籤',
  '快捷访问': '快捷訪問',
  '清空标签': '清空標籤',
  '没有匹配的资源结果': '沒有符合條件的資源結果',
  '当前没有可展示的资源': '目前沒有可顯示的資源',
  '可以放宽关键词、切换类别，或直接清空筛选。': '可以放寬關鍵字、切換分類，或直接清空篩選。',
  '从资源区右上角新增资源后，这里会立即出现结果。': '從資源區右上角新增資源後，這裡會立即出現結果。',
  '当前仅显示公开资源。若需要完整内容，请使用 Header 中的登录入口。': '目前僅顯示公開資源。若需完整內容，請使用 Header 中的登入入口。',
  '快捷访问、类别和标签筛选已收进左侧导航。': '快捷訪問、分類與標籤篩選已收進左側導覽。',
  '关闭导航遮罩': '關閉導覽遮罩',
  '私有': '私有',
  '公开': '公開',
  '暂无描述': '暫無描述',
  '取消收藏': '取消收藏',
  '收藏资源': '收藏資源',
  '编辑资源': '編輯資源',
  '更新于': '更新於',
  '创建于': '建立於',
  '访问': '訪問',
  '刚刚更新': '剛剛更新',
  '请登录后操作': '請登入後操作',
  '用户名或密码错误，请重新输入': '使用者名稱或密碼錯誤，請重新輸入',
  '类别': '類別',
  '标签': '標籤',
  '返回首页': '返回首頁',
  '类别管理': '類別管理',
  '标签管理': '標籤管理',
  '用户管理': '使用者管理',
  '系统配置': '系統配置',
  '邮件服务': '郵件服務',
  '保存配置': '儲存設定',
  '站点标题': '站點標題',
  '站点副标题': '站點副標題',
  '站点 Logo URL': '站點 Logo URL',
  '留空则使用默认图标': '留空則使用預設圖示',
  'Token 有效期（分钟）': 'Token 有效期（分鐘）',
  '重置链接有效期（分钟）': '重設連結有效期（分鐘）',
  '开放注册': '開放註冊',
  '限制注册邮箱域名': '限制註冊信箱網域',
  '已开启': '已開啟',
  '已关闭': '已關閉',
  '邮箱域名白名单': '信箱網域白名單',
  '测试连接': '測試連線',
  '加密方式': '加密方式',
  '无加密': '無加密',
  '发件人信息': '寄件者資訊',
  '发件人名称': '寄件者名稱',
  '发件人邮箱': '寄件者信箱',
  '显示名称': '顯示名稱',
  '角色': '角色',
  '状态': '狀態',
  '管理员': '管理員',
  '普通用户': '一般使用者',
  '启用': '啟用',
  '禁用': '停用',
  '编辑': '編輯',
  '删除': '刪除',
  '编辑用户': '編輯使用者',
  '新增用户': '新增使用者',
  '初始密码': '初始密碼',
  '账号状态': '帳號狀態',
  '密码强度：弱': '密碼強度：弱',
  '密码强度：中': '密碼強度：中',
  '密码强度：强': '密碼強度：強',
  '保存成功': '儲存成功',
  '请输入有效的邮箱地址': '請輸入有效的信箱地址',
  '请输入当前密码': '請輸入目前密碼',
  '新密码至少8位，需包含字母和数字': '新密碼至少 8 位，需包含字母與數字',
  '新密码不能与当前密码相同': '新密碼不能與目前密碼相同',
  '两次密码不一致': '兩次密碼不一致',
  '当前密码错误': '目前密碼錯誤',
  '修改失败': '修改失敗',
  '确认修改': '確認修改',
  '保存修改': '儲存修改',
  '注册时间': '註冊時間',
  '今天': '今天',
  '当前密码': '目前密碼',
  '取消': '取消',
  '关闭': '關閉',
  '保存': '儲存',
  '保存失败': '儲存失敗',
  '密码已修改': '密碼已修改',
  '资源名称': '資源名稱',
  '请输入资源名称': '請輸入資源名稱',
  '访问权限': '存取權限',
  'Logo URL（可选）': 'Logo URL（可選）',
  '选择类别': '選擇分類',
  '描述': '描述',
  '描述（可选，最多200字符）': '描述（可選，最多 200 字）',
  'URL需以 http:// 或 https:// 开头': 'URL 需以 http:// 或 https:// 開頭',
  'Logo URL格式不正确': 'Logo URL 格式不正確',
  '描述最多200字符': '描述最多 200 字元',
  '简短描述这个资源…': '簡短描述這個資源…',
  '标签（最多10个，每个最多20字符）': '標籤（最多 10 個，每個最多 20 字）',
  '输入标签后回车添加': '輸入標籤後按 Enter 新增',
  '启用状态': '啟用狀態',
  '资源可正常展示与访问': '資源可正常顯示與存取',
  '资源将被隐藏并停止对外展示': '資源將被隱藏並停止對外顯示',
  '批量录入': '批量錄入',
  '批量录入资源': '批量錄入資源',
  '每行一条资源，名称与 URL 必填；类别、访问权限、启用状态可选；标签可输入并从已有标签联想选择，最多 10 个。': '每行一筆資源，名稱與 URL 必填；分類、存取權限、啟用狀態可選；標籤可輸入並從既有標籤聯想選擇，最多 10 個。',
  '名称': '名稱',
  '操作': '操作',
  '输入或选择类别': '輸入或選擇分類',
  '可选': '可選',
  '输入选择标签': '輸入或選擇標籤',
  '添加一行': '新增一行',
  '批量保存': '批量儲存',
  '删除此行': '刪除此行',
  '匹配类别': '符合的分類',
  '已有类别': '已有分類',
  '匹配标签': '符合的標籤',
  '已有标签': '已有標籤',
  '收起类别列表': '收起分類列表',
  '展开类别列表': '展開分類列表',
  '统一访问入口': '統一存取入口',
  '统一管理与访问你的资源': '統一管理與存取你的資源',
  '登录以访问全部资源导航': '登入以存取完整資源導航',
  '资源工作台': '資源工作臺',
  '工作台': '工作臺',
  '请输入显示名称': '請輸入顯示名稱',
  '请输入邮箱地址': '請輸入信箱地址',
  '资源名称不能为空（最多50字符）': '資源名稱不能為空（最多 50 字）',
  '资源导航系统': '資源導航系統',
  '管理资源分类名称与配色，保持后台和结果页的类别语义一致。': '管理資源分類名稱與配色，保持後台與結果頁的分類語意一致。',
  '新增类别': '新增分類',
  '颜色': '顏色',
  '资源数': '資源數',
  '暂无类别': '暫無分類',
  '编辑类别': '編輯分類',
  '类别名称': '分類名稱',
  '输入类别名称': '輸入分類名稱',
  '类别名称不能为空': '分類名稱不能為空',
  '类别已更新': '分類已更新',
  '类别已创建': '分類已建立',
  '类别已删除': '分類已刪除',
  '删除类别': '刪除分類',
  '集中管理资源标签，保持筛选体系简洁、可读且一致。': '集中管理資源標籤，保持篩選體系簡潔、可讀且一致。',
  '刷新': '重新整理',
  '标签名': '標籤名',
  '使用次数': '使用次數',
  '暂无标签': '暫無標籤',
  '批量删除': '批量刪除',
  '批量删除标签': '批量刪除標籤',
  '删除标签': '刪除標籤',
  '管理账号、角色与状态，确保后台操作语义清晰而克制。': '管理帳號、角色與狀態，確保後台操作語意清晰且克制。',
  '用户已更新': '使用者已更新',
  '用户已创建': '使用者已建立',
  '用户已删除': '使用者已刪除',
  '删除用户': '刪除使用者',
  '用户的显示名称': '使用者的顯示名稱',
  '仅字母数字下划线，3-20位': '僅限字母、數字與底線，3-20 位',
  '显示名称不能为空（最多30字符）': '顯示名稱不能為空（最多 30 字）',
  '系统将自动生成临时密码并发送至用户邮箱，用户可凭临时密码登录后自行修改。': '系統將自動產生臨時密碼並寄送至使用者信箱，使用者可憑臨時密碼登入後自行修改。',
  '确认重置': '確認重設',
  '用户角色': '使用者角色',
  '暂无用户': '暫無使用者',
  '维护站点基础信息、注册策略与安全有效期配置。': '維護站點基礎資訊、註冊策略與安全有效期設定。',
  '留空时显示品牌色首字母图标': '留空時顯示品牌色首字母圖示',
  '多个域名用英文逗号分隔，留空则不限制': '多個網域請以英文逗號分隔，留空則不限制',
  '系统配置已保存': '系統設定已儲存',
  '管理 SMTP 连接与发件人信息，保持后台配置区的层级和交互一致。': '管理 SMTP 連線與寄件者資訊，保持後台設定區的層級與互動一致。',
  'SMTP 主机为空时，系统使用模拟邮件模式：邮件不会真实发送，仅在前端弹窗预览。': 'SMTP 主機為空時，系統會使用模擬郵件模式：郵件不會真正送出，只會在前端彈窗預覽。',
  'SMTP 主机': 'SMTP 主機',
  'SMTP 端口': 'SMTP 埠號',
  'SMTP 用户名': 'SMTP 使用者名稱',
  'SMTP 密码': 'SMTP 密碼',
  'smtp.example.com（留空使用模拟模式）': 'smtp.example.com（留空使用模擬模式）',
  '保持 *** 则不更改当前密码': '保留 *** 則不變更目前密碼',
  '填写 `***` 表示不修改当前已保存的密码': '填寫 `***` 表示不修改目前已儲存的密碼',
  '邮件配置已保存': '郵件設定已儲存',
  '发送失败': '發送失敗',
  '更新失败': '更新失敗',
  '创建失败': '建立失敗',
});

Object.assign(RH_STATIC_TRANSLATIONS.en, {
  '浅色': 'Light',
  '深色': 'Dark',
  '跟随系统': 'System',
  '登录': 'Sign In',
  '个人信息': 'Profile',
  '修改密码': 'Change Password',
  '后台管理': 'Admin',
  '注销登录': 'Sign Out',
  '搜索资源...': 'Search resources...',
  '搜索资源名称、描述、标签... (Ctrl+K)': 'Search names, descriptions, tags... (Ctrl+K)',
  '加载中…': 'Loading…',
  '确认删除': 'Delete',
  '模拟邮件（开发预览）': 'Mock Email (Preview)',
  '收件人：': 'To:',
  '主题：': 'Subject:',
  '正文：': 'Body:',
  '忘记密码': 'Forgot Password',
  '登录账号': 'Sign In',
  '用户名': 'Username',
  '请输入用户名': 'Enter username',
  '密码': 'Password',
  '请输入密码': 'Enter password',
  '隐藏密码': 'Hide password',
  '显示密码': 'Show password',
  '登录中...': 'Signing in...',
  '如无法登录或注册，请联系管理员确认账号与注册策略。': 'If sign-in or sign-up is unavailable, contact your administrator.',
  '忘记密码？': 'Forgot password?',
  '没有账号？': 'No account?',
  '注册账号': 'Create Account',
  '注册成功！初始密码已发送至邮箱': 'Registration succeeded. The initial password has been emailed.',
  '注册失败': 'Registration failed',
  '注册功能暂未开放': 'Registration is currently closed',
  '去登录': 'Go to Sign In',
  '邀请与注册': 'Invitation & Registration',
  '已有账号？': 'Already have an account?',
  '返回登录': 'Back to Sign In',
  '发送重置链接': 'Send Reset Link',
  '账号恢复': 'Account Recovery',
  '输入注册邮箱，系统将发送密码重置链接': 'Enter your registered email to receive a reset link.',
  '若该邮箱已注册，重置链接已发送，请查收': 'If the email is registered, a reset link has been sent.',
  '密码已重置，请登录': 'Password reset. Please sign in.',
  '重置失败': 'Reset failed',
  '链接已失效或过期': 'The link is invalid or expired',
  '请重新发送密码重置链接': 'Please request a new password reset link',
  '重新发送重置链接': 'Send another reset link',
  '重置密码': 'Reset Password',
  '设置新密码': 'Set New Password',
  '新密码': 'New Password',
  '确认新密码': 'Confirm Password',
  '至少8位，含字母和数字': 'At least 8 characters, including letters and numbers',
  '再次输入新密码': 'Enter the new password again',
  '再次输入密码': 'Enter the password again',
  '初始化成功！请登录': 'Setup completed. Please sign in.',
  '初始化失败': 'Setup failed',
  '首次初始化': 'Initial Setup',
  '欢迎使用资源导航系统': 'Welcome to ResourceHub',
  '请先完成初始化，创建管理员账号': 'Complete setup and create the first admin account.',
  '管理员用户名': 'Admin Username',
  '管理员显示名称': 'Admin Display Name',
  '管理员邮箱': 'Admin Email',
  '管理员密码': 'Admin Password',
  '确认密码': 'Confirm Password',
  '显示给其他用户的名称': 'Name shown to other users',
  '完成初始化': 'Finish Setup',
  '统一入口与常用访问能力，从这里开始。': 'A unified entry point for your everyday resources starts here.',
  '资源管理': 'Resource Management',
  '快速切换': 'Quick Access',
  '后台配置': 'Admin Configuration',
  '资源导航': 'Resource Hub',
  '我的收藏': 'Favorites',
  '最近访问': 'Recent',
  '我创建的': 'Mine',
  '按热度': 'By Popularity',
  '按创建时间': 'By Created Time',
  '按更新时间': 'By Updated Time',
  '卡片视图': 'Card View',
  '列表视图': 'List View',
  '时间轴视图': 'Timeline View',
  '全部资源': 'All Resources',
  '公开资源': 'Public Resources',
  '总访问量': 'Total Visits',
  '近30日访问': 'Visits in 30 Days',
  '近24小时访问': 'Visits in 24 Hours',
  '浏览全部资源': 'Browse All Resources',
  '可见资源': 'Accessible Resources',
  '当前可访问入口': 'Available right now',
  '资源分类': 'Categories',
  '按主题浏览入口': 'Browse by topic',
  '我的资源': 'My Resources',
  '我创建与维护的内容': 'Items I manage',
  '页面累计访问量': 'Page visits to date',
  '近 30 天记录': 'Last 30 days',
  '最近一天活跃': 'Most recent 24 hours',
  '无需登录即可访问': 'Available without signing in',
  '常用标签': 'Common Tags',
  '作为补充过滤条件': 'Use as extra filters',
  '快速回到常用资源': 'Jump back to favorites',
  '还没有收藏资源，先去逛逛并添加常用入口': 'No favorites yet. Browse around and pin your usual entries first.',
  '继续上次浏览路径': 'Continue where you left off',
  '还没有访问记录，先随便逛一逛': 'No visit history yet. Explore a few resources first.',
  '维护自己的内容': 'Keep your own content up to date',
  '还没有创建内容，可以尝试新增一个资源': 'Nothing created yet. Try adding a resource first.',
  '快捷入口': 'Quick Access',
  '从收藏、历史或我的资源继续浏览和维护内容。': 'Keep browsing and maintaining content from favorites, history, or your own resources.',
  '分类入口': 'Category Entry Points',
  '按主题快速浏览全部资源。': 'Browse all resources quickly by topic.',
  '查看更多': 'View More',
  '全部': 'All',
  '全部可见资源': 'All Accessible Resources',
  '公开资源浏览': 'Public Resource View',
  '返回首页概览': 'Back to Overview',
  '暂无数据': 'No data yet',
  '点击进入该分类结果页': 'Open this category result view',
  '按访问热度挑选常用入口。': 'Pick everyday entries by visit popularity.',
  '快速查看最近维护或新增的内容。': 'Quickly scan what was recently updated or newly added.',
  '继续维护你创建和拥有的资源。': 'Keep maintaining the resources you created or own.',
  '热门资源': 'Popular Resources',
  '最近更新': 'Recently Updated',
  '新增资源': 'Add Resource',
  '筛选': 'Filters',
  '按创建时间归档': 'Archived by created time',
  '清空': 'Clear',
  '清空筛选': 'Clear Filters',
  '类别筛选结果': 'Category Results',
  '范围筛选结果': 'Scope Results',
  '搜索结果': 'Search Results',
  '标签筛选结果': 'Tag Results',
  '筛选结果': 'Filtered Results',
  '类别过滤': 'Category Filters',
  '标签筛选': 'Tag Filters',
  '收起标签': 'Collapse Tags',
  '快捷访问': 'Quick Access',
  '清空标签': 'Clear Tags',
  '没有匹配的资源结果': 'No matching resources found',
  '当前没有可展示的资源': 'No resources are available to show right now',
  '可以放宽关键词、切换类别，或直接清空筛选。': 'Try broader keywords, switch categories, or clear the filters.',
  '从资源区右上角新增资源后，这里会立即出现结果。': 'Once you add a resource from the upper-right action, it will appear here right away.',
  '当前仅显示公开资源。若需要完整内容，请使用 Header 中的登录入口。': 'Only public resources are shown right now. Use the sign-in entry in the header for the full view.',
  '快捷访问、类别和标签筛选已收进左侧导航。': 'Quick access, category filters, and tag filters now live in the left sidebar.',
  '关闭导航遮罩': 'Close navigation overlay',
  '私有': 'Private',
  '公开': 'Public',
  '暂无描述': 'No description',
  '取消收藏': 'Remove Favorite',
  '收藏资源': 'Favorite',
  '编辑资源': 'Edit Resource',
  '更新于': 'Updated',
  '创建于': 'Created',
  '访问': 'Visits',
  '刚刚更新': 'Just now',
  '请登录后操作': 'Please sign in first',
  '用户名或密码错误，请重新输入': 'Username or password is incorrect. Please try again.',
  '类别': 'Categories',
  '标签': 'Tags',
  '返回首页': 'Back to Home',
  '类别管理': 'Category Management',
  '标签管理': 'Tag Management',
  '用户管理': 'User Management',
  '系统配置': 'System Settings',
  '邮件服务': 'Email Service',
  '保存配置': 'Save Settings',
  '站点标题': 'Site Title',
  '站点副标题': 'Site Subtitle',
  '站点 Logo URL': 'Site Logo URL',
  '留空则使用默认图标': 'Leave empty to use the default icon',
  'Token 有效期（分钟）': 'Token Expiry (minutes)',
  '重置链接有效期（分钟）': 'Reset Link Expiry (minutes)',
  '开放注册': 'Open Registration',
  '限制注册邮箱域名': 'Restrict Email Domain',
  '已开启': 'Enabled',
  '已关闭': 'Disabled',
  '邮箱域名白名单': 'Email Domain Allowlist',
  '测试连接': 'Send Test',
  '加密方式': 'Encryption',
  '无加密': 'No Encryption',
  '发件人信息': 'Sender',
  '发件人名称': 'Sender Name',
  '发件人邮箱': 'Sender Email',
  '显示名称': 'Display Name',
  '邮箱': 'Email',
  '角色': 'Role',
  '状态': 'Status',
  '管理员': 'Admin',
  '普通用户': 'User',
  '启用': 'Active',
  '禁用': 'Disabled',
  '编辑': 'Edit',
  '删除': 'Delete',
  '编辑用户': 'Edit User',
  '新增用户': 'Add User',
  '初始密码': 'Initial Password',
  '账号状态': 'Account Status',
  '密码强度：弱': 'Password Strength: Weak',
  '密码强度：中': 'Password Strength: Medium',
  '密码强度：强': 'Password Strength: Strong',
  '保存成功': 'Saved successfully',
  '请输入有效的邮箱地址': 'Enter a valid email address',
  '请输入当前密码': 'Enter current password',
  '新密码至少8位，需包含字母和数字': 'Password must be at least 8 characters and include letters and numbers',
  '新密码不能与当前密码相同': 'New password must differ from the current password',
  '两次密码不一致': 'Passwords do not match',
  '当前密码错误': 'Current password is incorrect',
  '修改失败': 'Update failed',
  '确认修改': 'Confirm Changes',
  '保存修改': 'Save Changes',
  '注册时间': 'Created At',
  '今天': 'Today',
  '更顺手地进入你的': 'A smoother way into your',
  '常用入口能力': 'Core Access Capabilities',
  '登录后可直接访问的核心能力': 'Core capabilities available right after sign-in',
  '公开与私有资源统一进入，常用内容不再分散。': 'Public and private resources live in one place, so your usual content stays together.',
  '收藏、最近访问与我创建的内容都能快速回到手边。': 'Jump back quickly to favorites, recent visits, and the content you created.',
  '管理员可直接进入系统配置与邮件服务管理。': 'Admins can go straight to system settings and email service management.',
  '当前密码': 'Current Password',
  '取消': 'Cancel',
  '关闭': 'Close',
  '保存': 'Save',
  '保存失败': 'Save failed',
  '密码已修改': 'Password updated',
  '资源名称': 'Resource Name',
  '请输入资源名称': 'Enter resource name',
  '访问权限': 'Access',
  'Logo URL（可选）': 'Logo URL (Optional)',
  '选择类别': 'Select category',
  '描述': 'Description',
  '描述（可选，最多200字符）': 'Description (Optional, up to 200 characters)',
  'URL需以 http:// 或 https:// 开头': 'URL must start with http:// or https://',
  'Logo URL格式不正确': 'Logo URL is invalid',
  '描述最多200字符': 'Description can be at most 200 characters',
  '简短描述这个资源…': 'Add a short description for this resource...',
  '标签（最多10个，每个最多20字符）': 'Tags (up to 10, 20 characters each)',
  '输入标签后回车添加': 'Type a tag and press Enter',
  '启用状态': 'Enabled Status',
  '资源可正常展示与访问': 'This resource can be shown and visited normally',
  '资源将被隐藏并停止对外展示': 'This resource will be hidden from public view',
  '批量录入': 'Bulk Entry',
  '批量录入资源': 'Bulk Resource Entry',
  '每行一条资源，名称与 URL 必填；类别、访问权限、启用状态可选；标签可输入并从已有标签联想选择，最多 10 个。': 'One resource per row. Name and URL are required; category, access, and enabled state are optional; tags support suggestions from existing tags, up to 10 total.',
  '名称': 'Name',
  '操作': 'Actions',
  '输入或选择类别': 'Type or select a category',
  '可选': 'Optional',
  '输入选择标签': 'Type or select tags',
  '添加一行': 'Add Row',
  '批量保存': 'Save All',
  '删除此行': 'Delete row',
  '匹配类别': 'Matching Categories',
  '已有类别': 'Existing Categories',
  '匹配标签': 'Matching Tags',
  '已有标签': 'Existing Tags',
  '收起类别列表': 'Collapse category list',
  '展开类别列表': 'Expand category list',
  '统一访问入口': 'Unified Access Point',
  '统一管理与访问你的资源': 'Manage and access your resources in one place',
  '登录以访问全部资源导航': 'Sign in to access the full resource hub',
  '资源工作台': 'Resource Workspace',
  '工作台': 'Workspace',
  '请输入显示名称': 'Enter display name',
  '请输入邮箱地址': 'Enter email address',
  '资源名称不能为空（最多50字符）': 'Resource name is required (up to 50 characters)',
  '资源导航系统': 'ResourceHub',
  '管理资源分类名称与配色，保持后台和结果页的类别语义一致。': 'Manage category names and colors so admin and results views stay aligned.',
  '新增类别': 'Add Category',
  '颜色': 'Color',
  '资源数': 'Resource Count',
  '暂无类别': 'No categories yet',
  '编辑类别': 'Edit Category',
  '类别名称': 'Category Name',
  '输入类别名称': 'Enter category name',
  '类别名称不能为空': 'Category name is required',
  '类别已更新': 'Category updated',
  '类别已创建': 'Category created',
  '类别已删除': 'Category deleted',
  '删除类别': 'Delete Category',
  '集中管理资源标签，保持筛选体系简洁、可读且一致。': 'Manage resource tags in one place so filtering stays concise, readable, and consistent.',
  '刷新': 'Refresh',
  '标签名': 'Tag Name',
  '使用次数': 'Usage Count',
  '暂无标签': 'No tags yet',
  '批量删除': 'Batch Delete',
  '批量删除标签': 'Batch Delete Tags',
  '删除标签': 'Delete Tag',
  '管理账号、角色与状态，确保后台操作语义清晰而克制。': 'Manage accounts, roles, and statuses with clear, restrained admin controls.',
  '用户已更新': 'User updated',
  '用户已创建': 'User created',
  '用户已删除': 'User deleted',
  '删除用户': 'Delete User',
  '用户的显示名称': 'User display name',
  '仅字母数字下划线，3-20位': 'Letters, numbers, and underscores only, 3-20 characters',
  '显示名称不能为空（最多30字符）': 'Display name is required (up to 30 characters)',
  '系统将自动生成临时密码并发送至用户邮箱，用户可凭临时密码登录后自行修改。': 'The system will generate a temporary password and email it to the user. They can sign in with it and change it afterward.',
  '确认重置': 'Confirm Reset',
  '用户角色': 'User Role',
  '暂无用户': 'No users yet',
  '维护站点基础信息、注册策略与安全有效期配置。': 'Manage site identity, registration rules, and security expiry settings.',
  '留空时显示品牌色首字母图标': 'Leave empty to show a brand-colored initial icon',
  '多个域名用英文逗号分隔，留空则不限制': 'Use commas to separate multiple domains. Leave empty for no restriction.',
  '系统配置已保存': 'System settings saved',
  '管理 SMTP 连接与发件人信息，保持后台配置区的层级和交互一致。': 'Manage SMTP connectivity and sender details while keeping the admin settings area consistent.',
  'SMTP 主机为空时，系统使用模拟邮件模式：邮件不会真实发送，仅在前端弹窗预览。': 'When SMTP host is empty, the system uses mock email mode. Messages are not sent for real and are only previewed in a frontend modal.',
  'SMTP 主机': 'SMTP Host',
  'SMTP 端口': 'SMTP Port',
  'SMTP 用户名': 'SMTP Username',
  'SMTP 密码': 'SMTP Password',
  'smtp.example.com（留空使用模拟模式）': 'smtp.example.com (leave empty for mock mode)',
  '保持 *** 则不更改当前密码': 'Keep *** to retain the current password',
  '填写 `***` 表示不修改当前已保存的密码': 'Enter `***` to keep the currently saved password',
  '邮件配置已保存': 'Email settings saved',
  '发送失败': 'Send failed',
  '更新失败': 'Update failed',
  '创建失败': 'Create failed',
});

Object.assign(RH_STATIC_TRANSLATIONS.ja, {
  '浅色': 'ライト',
  '深色': 'ダーク',
  '跟随系统': 'システム',
  '登录': 'ログイン',
  '个人信息': 'プロフィール',
  '修改密码': 'パスワード変更',
  '后台管理': '管理画面',
  '注销登录': 'ログアウト',
  '搜索资源...': 'リソースを検索...',
  '搜索资源名称、描述、标签... (Ctrl+K)': '名前・説明・タグを検索... (Ctrl+K)',
  '加载中…': '読み込み中…',
  '确认删除': '削除する',
  '模拟邮件（开发预览）': 'モックメール（プレビュー）',
  '收件人：': '宛先：',
  '主题：': '件名：',
  '正文：': '本文：',
  '忘记密码': 'パスワードを忘れた場合',
  '登录账号': 'ログイン',
  '用户名': 'ユーザー名',
  '请输入用户名': 'ユーザー名を入力',
  '密码': 'パスワード',
  '请输入密码': 'パスワードを入力',
  '隐藏密码': 'パスワードを隠す',
  '显示密码': 'パスワードを表示',
  '登录中...': 'ログイン中...',
  '忘记密码？': 'パスワードを忘れましたか？',
  '没有账号？': 'アカウントがありませんか？',
  '注册账号': 'アカウント登録',
  '注册成功！初始密码已发送至邮箱': '登録に成功しました。初期パスワードをメール送信しました。',
  '注册失败': '登録に失敗しました',
  '注册功能暂未开放': '登録は現在利用できません',
  '去登录': 'ログインへ',
  '邀请与注册': '招待と登録',
  '已有账号？': 'すでにアカウントをお持ちですか？',
  '返回登录': 'ログインに戻る',
  '发送重置链接': '再設定リンクを送信',
  '账号恢复': 'アカウント復旧',
  '若该邮箱已注册，重置链接已发送，请查收': '登録済みの場合、再設定リンクを送信しました。',
  '密码已重置，请登录': 'パスワードを再設定しました。ログインしてください。',
  '重置失败': '再設定に失敗しました',
  '链接已失效或过期': 'リンクは無効または期限切れです',
  '请重新发送密码重置链接': '新しい再設定リンクを送信してください',
  '重新发送重置链接': '再設定リンクを再送信',
  '重置密码': 'パスワード再設定',
  '设置新密码': '新しいパスワードを設定',
  '新密码': '新しいパスワード',
  '确认新密码': '新しいパスワードの確認',
  '至少8位，含字母和数字': '8文字以上、英字と数字を含めてください',
  '再次输入新密码': '新しいパスワードをもう一度入力',
  '再次输入密码': 'パスワードをもう一度入力',
  '初始化成功！请登录': '初期設定が完了しました。ログインしてください。',
  '初始化失败': '初期設定に失敗しました',
  '首次初始化': '初回セットアップ',
  '欢迎使用资源导航系统': 'ResourceHub へようこそ',
  '请先完成初始化，创建管理员账号': 'まず初期設定を完了し、管理者アカウントを作成してください。',
  '管理员用户名': '管理者ユーザー名',
  '管理员显示名称': '管理者表示名',
  '管理员邮箱': '管理者メール',
  '管理员密码': '管理者パスワード',
  '确认密码': 'パスワード確認',
  '显示给其他用户的名称': '他のユーザーに表示される名前',
  '完成初始化': 'セットアップ完了',
  '资源导航': 'リソースハブ',
  '我的收藏': 'お気に入り',
  '最近访问': '最近のアクセス',
  '我创建的': '自分のリソース',
  '按热度': '人気順',
  '按创建时间': '作成日時順',
  '按更新时间': '更新日時順',
  '卡片视图': 'カード表示',
  '列表视图': 'リスト表示',
  '时间轴视图': 'タイムライン表示',
  '全部资源': 'すべてのリソース',
  '公开资源': '公開リソース',
  '总访问量': '総アクセス数',
  '近30日访问': '直近30日のアクセス',
  '近24小时访问': '直近24時間のアクセス',
  '浏览全部资源': 'すべてのリソースを見る',
  '可见资源': '表示可能なリソース',
  '当前可访问入口': '今すぐ使える入口',
  '资源分类': 'リソース分類',
  '按主题浏览入口': 'テーマ別に見る',
  '我的资源': '自分のリソース',
  '我创建与维护的内容': '自分で作成・管理している内容',
  '页面累计访问量': 'ページ累計アクセス数',
  '近 30 天记录': '過去 30 日の記録',
  '最近一天活跃': '直近 1 日のアクティブ',
  '无需登录即可访问': 'ログインなしでアクセス可能',
  '常用标签': 'よく使うタグ',
  '作为补充过滤条件': '追加フィルターとして利用',
  '快速回到常用资源': 'よく使うリソースへすぐ戻る',
  '还没有收藏资源，先去逛逛并添加常用入口': 'お気に入りはまだありません。先にいくつか見て、よく使う入口を追加してください。',
  '继续上次浏览路径': '前回の続きから確認',
  '还没有访问记录，先随便逛一逛': '閲覧履歴はまだありません。まずはいくつか見てみましょう。',
  '维护自己的内容': '自分の内容を管理する',
  '还没有创建内容，可以尝试新增一个资源': 'まだ作成した内容がありません。まずはリソースを追加してみましょう。',
  '快捷入口': 'クイック入口',
  '从收藏、历史或我的资源继续浏览和维护内容。': 'お気に入り、履歴、自分のリソースから続けて閲覧・管理できます。',
  '分类入口': 'カテゴリ入口',
  '按主题快速浏览全部资源。': 'テーマごとにすべてのリソースをすばやく確認できます。',
  '查看更多': 'もっと見る',
  '全部': 'すべて',
  '全部可见资源': '表示可能なすべてのリソース',
  '公开资源浏览': '公開リソース一覧',
  '返回首页概览': '概要ページに戻る',
  '暂无数据': 'データはまだありません',
  '点击进入该分类结果页': 'このカテゴリの結果ページを開く',
  '按访问热度挑选常用入口。': 'アクセス数の多い入口からよく使うものを選べます。',
  '快速查看最近维护或新增的内容。': '最近更新・追加された内容をすばやく確認できます。',
  '继续维护你创建和拥有的资源。': '自分で作成・所有しているリソースを引き続き管理できます。',
  '热门资源': '人気のリソース',
  '最近更新': '最近更新',
  '新增资源': 'リソースを追加',
  '筛选': '絞り込み',
  '按创建时间归档': '作成日時でアーカイブ',
  '清空': 'クリア',
  '清空筛选': '絞り込みを解除',
  '类别筛选结果': 'カテゴリ絞り込み結果',
  '范围筛选结果': '範囲の絞り込み結果',
  '搜索结果': '検索結果',
  '标签筛选结果': 'タグの絞り込み結果',
  '筛选结果': '絞り込み結果',
  '类别过滤': 'カテゴリ絞り込み',
  '标签筛选': 'タグ絞り込み',
  '收起标签': 'タグを折りたたむ',
  '快捷访问': 'クイックアクセス',
  '清空标签': 'タグをクリア',
  '没有匹配的资源结果': '一致するリソースが見つかりません',
  '当前没有可展示的资源': '現在表示できるリソースはありません',
  '可以放宽关键词、切换类别，或直接清空筛选。': 'キーワードを広げるか、カテゴリを切り替えるか、絞り込みをクリアしてください。',
  '从资源区右上角新增资源后，这里会立即出现结果。': '右上の追加操作からリソースを作成すると、ここにすぐ表示されます。',
  '当前仅显示公开资源。若需要完整内容，请使用 Header 中的登录入口。': '現在は公開リソースのみ表示しています。すべてを見るにはヘッダーのログイン入口を使ってください。',
  '快捷访问、类别和标签筛选已收进左侧导航。': 'クイックアクセス、カテゴリ、タグの絞り込みは左側ナビにまとめています。',
  '关闭导航遮罩': 'ナビゲーションのオーバーレイを閉じる',
  '私有': '非公開',
  '公开': '公開',
  '暂无描述': '説明なし',
  '取消收藏': 'お気に入り解除',
  '收藏资源': 'お気に入り',
  '编辑资源': 'リソース編集',
  '更新于': '更新：',
  '创建于': '作成：',
  '访问': 'アクセス',
  '刚刚更新': 'たった今',
  '请登录后操作': 'ログイン後に操作してください',
  '用户名或密码错误，请重新输入': 'ユーザー名またはパスワードが正しくありません。もう一度お試しください。',
  '返回首页': 'ホームへ戻る',
  '类别管理': 'カテゴリ管理',
  '标签管理': 'タグ管理',
  '用户管理': 'ユーザー管理',
  '系统配置': 'システム設定',
  '邮件服务': 'メール設定',
  '保存配置': '設定を保存',
  '站点标题': 'サイトタイトル',
  '站点副标题': 'サイトサブタイトル',
  'Token 有效期（分钟）': 'Token 有効期限（分）',
  '重置链接有效期（分钟）': '再設定リンク有効期限（分）',
  '开放注册': '登録を開放',
  '限制注册邮箱域名': '登録メールドメイン制限',
  '已开启': '有効',
  '已关闭': '無効',
  '邮箱域名白名单': 'メールドメイン許可リスト',
  '测试连接': '接続テスト',
  '加密方式': '暗号化方式',
  '无加密': '暗号化なし',
  '发件人信息': '送信者情報',
  '发件人名称': '送信者名',
  '发件人邮箱': '送信者メール',
  '显示名称': '表示名',
  '邮箱': 'メール',
  '角色': '権限',
  '状态': '状態',
  '管理员': '管理者',
  '普通用户': '一般ユーザー',
  '启用': '有効',
  '禁用': '無効',
  '编辑': '編集',
  '删除': '削除',
  '编辑用户': 'ユーザー編集',
  '新增用户': 'ユーザー追加',
  '初始密码': '初期パスワード',
  '账号状态': 'アカウント状態',
  '密码强度：弱': 'パスワード強度：弱',
  '密码强度：中': 'パスワード強度：中',
  '密码强度：强': 'パスワード強度：強',
  '保存成功': '保存しました',
  '请输入有效的邮箱地址': '有効なメールアドレスを入力してください',
  '请输入当前密码': '現在のパスワードを入力してください',
  '新密码至少8位，需包含字母和数字': '新しいパスワードは8文字以上で、英字と数字を含めてください',
  '新密码不能与当前密码相同': '新しいパスワードは現在のものと異なる必要があります',
  '两次密码不一致': '確認用パスワードが一致しません',
  '当前密码错误': '現在のパスワードが正しくありません',
  '修改失败': '更新に失敗しました',
  '确认修改': '変更を確定',
  '保存修改': '変更を保存',
  '注册时间': '登録日時',
  '今天': '今日',
  '更顺手地进入你的': 'あなたの',
  '常用入口能力': 'よく使う入口機能',
  '登录后可直接访问的核心能力': 'ログイン後すぐ使える主要機能',
  '公开与私有资源统一进入，常用内容不再分散。': '公開・非公開リソースをまとめて扱え、よく使う内容が分散しません。',
  '收藏、最近访问与我创建的内容都能快速回到手边。': 'お気に入り、最近のアクセス、自分で作成した内容へすぐ戻れます。',
  '管理员可直接进入系统配置与邮件服务管理。': '管理者はシステム設定とメールサービス管理へ直接入れます。',
  '当前密码': '現在のパスワード',
  '取消': 'キャンセル',
  '关闭': '閉じる',
  '保存': '保存',
  '保存失败': '保存に失敗しました',
  '密码已修改': 'パスワードを変更しました',
  '资源名称': 'リソース名',
  '请输入资源名称': 'リソース名を入力',
  '访问权限': 'アクセス権限',
  'Logo URL（可选）': 'ロゴ URL（任意）',
  '选择类别': 'カテゴリを選択',
  '描述': '説明',
  '描述（可选，最多200字符）': '説明（任意、200文字まで）',
  'URL需以 http:// 或 https:// 开头': 'URL は http:// または https:// で始めてください',
  'Logo URL格式不正确': 'Logo URL の形式が正しくありません',
  '描述最多200字符': '説明は最大 200 文字までです',
  '简短描述这个资源…': 'このリソースを簡単に説明...',
  '标签（最多10个，每个最多20字符）': 'タグ（最大10件、各20文字まで）',
  '输入标签后回车添加': 'タグを入力して Enter で追加',
  '启用状态': '有効状態',
  '资源可正常展示与访问': 'このリソースは通常どおり表示・アクセスできます',
  '资源将被隐藏并停止对外展示': 'このリソースは非表示になり、外部には表示されません',
  '批量录入': '一括入力',
  '批量录入资源': 'リソース一括入力',
  '每行一条资源，名称与 URL 必填；类别、访问权限、启用状态可选；标签可输入并从已有标签联想选择，最多 10 个。': '1 行につき 1 件のリソースです。名前と URL は必須、カテゴリ・アクセス権限・有効状態は任意、タグは既存タグから候補選択でき、最大 10 件までです。',
  '名称': '名前',
  '操作': '操作',
  '输入或选择类别': '入力またはカテゴリを選択',
  '可选': '任意',
  '输入选择标签': '入力またはタグを選択',
  '添加一行': '行を追加',
  '批量保存': 'まとめて保存',
  '删除此行': 'この行を削除',
  '匹配类别': '一致するカテゴリ',
  '已有类别': '既存のカテゴリ',
  '匹配标签': '一致するタグ',
  '已有标签': '既存のタグ',
  '收起类别列表': 'カテゴリ一覧を閉じる',
  '展开类别列表': 'カテゴリ一覧を開く',
  '统一访问入口': '統一アクセス入口',
  '统一管理与访问你的资源': 'リソースを一元管理してアクセス',
  '登录以访问全部资源导航': 'ログインしてすべてのリソースナビにアクセス',
  '资源工作台': 'リソースワークスペース',
  '工作台': 'ワークスペース',
  '请输入显示名称': '表示名を入力',
  '请输入邮箱地址': 'メールアドレスを入力',
  '资源名称不能为空（最多50字符）': 'リソース名は必須です（50文字以内）',
  '资源导航系统': 'ResourceHub',
  '管理资源分类名称与配色，保持后台和结果页的类别语义一致。': 'リソース分類の名称と配色を管理し、管理画面と結果ページの分類表現を揃えます。',
  '新增类别': 'カテゴリを追加',
  '颜色': '色',
  '资源数': 'リソース数',
  '暂无类别': 'カテゴリはまだありません',
  '编辑类别': 'カテゴリ編集',
  '类别名称': 'カテゴリ名',
  '输入类别名称': 'カテゴリ名を入力',
  '类别名称不能为空': 'カテゴリ名は必須です',
  '类别已更新': 'カテゴリを更新しました',
  '类别已创建': 'カテゴリを作成しました',
  '类别已删除': 'カテゴリを削除しました',
  '删除类别': 'カテゴリを削除',
  '集中管理资源标签，保持筛选体系简洁、可读且一致。': 'リソースタグを一元管理し、絞り込み体系を簡潔で読みやすく一貫したものに保ちます。',
  '刷新': '更新',
  '标签名': 'タグ名',
  '使用次数': '使用回数',
  '暂无标签': 'タグはまだありません',
  '批量删除': '一括削除',
  '批量删除标签': 'タグを一括削除',
  '删除标签': 'タグを削除',
  '管理账号、角色与状态，确保后台操作语义清晰而克制。': 'アカウント、権限、状態を管理し、管理操作の意味が明確で過度にならないようにします。',
  '用户已更新': 'ユーザーを更新しました',
  '用户已创建': 'ユーザーを作成しました',
  '用户已删除': 'ユーザーを削除しました',
  '删除用户': 'ユーザーを削除',
  '用户的显示名称': 'ユーザーの表示名',
  '仅字母数字下划线，3-20位': '英数字とアンダースコアのみ、3〜20 文字',
  '显示名称不能为空（最多30字符）': '表示名は必須です（30文字以内）',
  '系统将自动生成临时密码并发送至用户邮箱，用户可凭临时密码登录后自行修改。': 'システムが一時パスワードを自動生成してユーザーのメールへ送信します。ユーザーはそのパスワードでログイン後、自分で変更できます。',
  '确认重置': 'リセットを確認',
  '用户角色': 'ユーザー権限',
  '暂无用户': 'ユーザーはまだありません',
  '维护站点基础信息、注册策略与安全有效期配置。': 'サイトの基本情報、登録ポリシー、安全関連の有効期限設定を管理します。',
  '留空时显示品牌色首字母图标': '空欄の場合はブランドカラーの頭文字アイコンを表示します',
  '多个域名用英文逗号分隔，留空则不限制': '複数ドメインは半角カンマで区切ってください。空欄なら制限しません',
  '系统配置已保存': 'システム設定を保存しました',
  '管理 SMTP 连接与发件人信息，保持后台配置区的层级和交互一致。': 'SMTP 接続と送信者情報を管理し、管理設定エリアの階層と操作感を揃えます。',
  'SMTP 主机为空时，系统使用模拟邮件模式：邮件不会真实发送，仅在前端弹窗预览。': 'SMTP ホストが空の場合、システムはモックメールモードを使用します。メールは実際には送信されず、フロントエンドのモーダルでのみプレビューされます。',
  'SMTP 主机': 'SMTP ホスト',
  'SMTP 端口': 'SMTP ポート',
  'SMTP 用户名': 'SMTP ユーザー名',
  'SMTP 密码': 'SMTP パスワード',
  'smtp.example.com（留空使用模拟模式）': 'smtp.example.com（空欄でモックモード）',
  '保持 *** 则不更改当前密码': '*** のままなら現在のパスワードを変更しません',
  '填写 `***` 表示不修改当前已保存的密码': '`***` と入力すると現在保存されているパスワードを変更しません',
  '邮件配置已保存': 'メール設定を保存しました',
  '发送失败': '送信に失敗しました',
  '更新失败': '更新に失敗しました',
  '创建失败': '作成に失敗しました',
});

function normalizeLocale(candidate) {
  if (!candidate) return RH_DEFAULT_LOCALE;
  const normalized = String(candidate).trim();
  if (!normalized) return RH_DEFAULT_LOCALE;

  const firstToken = normalized.split(',')[0].trim();
  const languageToken = firstToken.split(';')[0].trim().toLowerCase();

  if (RH_SUPPORTED_LOCALES.includes(firstToken)) return firstToken;
  if (RH_SUPPORTED_LOCALES.includes(normalized)) return normalized;
  if (languageToken === 'zh-hant' || languageToken.startsWith('zh-tw') || languageToken.startsWith('zh-hk') || languageToken.startsWith('zh-mo')) {
    return 'zh-Hant';
  }
  if (languageToken === 'zh-hans' || languageToken.startsWith('zh-cn') || languageToken.startsWith('zh-sg') || languageToken === 'zh') {
    return 'zh-Hans';
  }
  if (languageToken.startsWith('en')) return 'en';
  if (languageToken.startsWith('ja')) return 'ja';
  return RH_DEFAULT_LOCALE;
}

function detectBrowserLocale() {
  const browserLocales = [];
  if (Array.isArray(window.navigator?.languages)) browserLocales.push(...window.navigator.languages);
  if (window.navigator?.language) browserLocales.push(window.navigator.language);

  for (const candidate of browserLocales) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }

  return RH_DEFAULT_LOCALE;
}

let currentLocale = detectBrowserLocale();

function withTrimmedString(value, mapper) {
  if (typeof value !== 'string') return value;
  const match = value.match(/^(\s*)(.*?)(\s*)$/s);
  const leading = match?.[1] || '';
  const core = match?.[2] || '';
  const trailing = match?.[3] || '';
  if (!core) return value;
  return `${leading}${mapper(core)}${trailing}`;
}

function translateFromStaticMap(locale, coreText) {
  return RH_STATIC_TRANSLATIONS[locale]?.[coreText] || null;
}

function translateFromPatterns(locale, coreText) {
  for (const translator of RH_PATTERN_TRANSLATORS) {
    const match = coreText.match(translator.test);
    if (match) return translator.render(locale, match);
  }
  return null;
}

function translateText(localeOrText, maybeText) {
  const locale = maybeText === undefined ? currentLocale : normalizeLocale(localeOrText);
  const sourceText = maybeText === undefined ? localeOrText : maybeText;
  if (typeof sourceText !== 'string') return sourceText;
  if (locale === 'zh-Hans') return sourceText;

  return withTrimmedString(sourceText, (coreText) => {
    const staticTranslation = translateFromStaticMap(locale, coreText);
    if (staticTranslation) return staticTranslation;
    const patternTranslation = translateFromPatterns(locale, coreText);
    if (patternTranslation) return patternTranslation;
    return coreText;
  });
}

function transformDomProps(props) {
  if (!props) return props;

  let nextProps = props;
  ['placeholder', 'title', 'aria-label', 'ariaLabel'].forEach((propName) => {
    if (typeof props[propName] !== 'string') return;
    const translated = translateText(props[propName]);
    if (translated === props[propName]) return;
    if (nextProps === props) nextProps = { ...props };
    nextProps[propName] = translated;
  });

  if (props.readOnly && typeof props.value === 'string') {
    const translatedValue = translateText(props.value);
    if (translatedValue !== props.value) {
      if (nextProps === props) nextProps = { ...props };
      nextProps.value = translatedValue;
    }
  }

  return nextProps;
}

function transformChild(child) {
  if (typeof child === 'string') return translateText(child);
  if (Array.isArray(child)) return child.map(transformChild);
  return child;
}

if (!window.__rhPatchedCreateElement) {
  const originalCreateElement = React.createElement.bind(React);
  React.createElement = function patchedCreateElement(type, props, ...children) {
    const nextProps = typeof type === 'string' ? transformDomProps(props) : props;
    const nextChildren = children.map(transformChild);
    return originalCreateElement(type, nextProps, ...nextChildren);
  };
  window.__rhPatchedCreateElement = true;
}

function applyLocale(locale) {
  currentLocale = normalizeLocale(locale);
  document.documentElement.lang = currentLocale;
  document.documentElement.dataset.rhLocale = currentLocale;
  return currentLocale;
}

function getCurrentLocale() {
  return currentLocale;
}

function getIntlLocale(locale = currentLocale) {
  return RH_INTL_LOCALE_MAP[normalizeLocale(locale)] || RH_INTL_LOCALE_MAP[RH_DEFAULT_LOCALE];
}

function getLocaleNativeLabel(locale) {
  return RH_LOCALE_NATIVE_LABELS[normalizeLocale(locale)] || RH_LOCALE_NATIVE_LABELS[RH_DEFAULT_LOCALE];
}

function useI18n() {
  const state = window.useAppState?.();
  const dispatch = window.useAppDispatch?.();
  const locale = normalizeLocale(state?.locale || currentLocale);

  React.useEffect(() => {
    applyLocale(locale);
  }, [locale]);

  const setLocale = React.useCallback((nextLocale) => {
    const resolved = normalizeLocale(nextLocale);
    if (dispatch) {
      dispatch({ type: 'SET_LOCALE', locale: resolved });
      return;
    }
    applyLocale(resolved);
  }, [dispatch]);

  const t = React.useCallback((text) => translateText(locale, text), [locale]);

  return {
    locale,
    setLocale,
    t,
    locales: RH_SUPPORTED_LOCALES,
    defaultLocale: RH_DEFAULT_LOCALE,
    getNativeLabel: getLocaleNativeLabel,
    intlLocale: getIntlLocale(locale),
  };
}

window.i18n = {
  SUPPORTED_LOCALES: RH_SUPPORTED_LOCALES,
  DEFAULT_LOCALE: RH_DEFAULT_LOCALE,
  LOCALE_NATIVE_LABELS: RH_LOCALE_NATIVE_LABELS,
  normalizeLocale,
  detectBrowserLocale,
  applyLocale,
  translateText,
  getCurrentLocale,
  getIntlLocale,
  getLocaleNativeLabel,
  useI18n,
};

applyLocale(currentLocale);
