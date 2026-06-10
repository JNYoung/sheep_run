export type Locale = "zh-CN" | "en" | "ja";

const localeOrder: Locale[] = ["zh-CN", "en", "ja"];

const tables: Record<Locale, Record<string, string>> = {
  "zh-CN": {
    "app.title": "赶了个羊",
    "app.subtitle": "不同朝向的小羊，只有一个糖果羊圈。",
    "button.start": "开始",
    "button.retry": "重开",
    "button.next": "下一关",
    "button.menu": "菜单",
    "button.language": "语言",
    "button.mute": "静音",
    "button.sound": "声音",
    "menu.levels": "关卡",
    "objective.default": "按小羊朝向清路，前方被挡就会失败。",
    "status.ready": "已入圈 {done}/{total}，选择一只前路畅通的小羊。",
    "status.moving": "小羊跑向羊圈...",
    "status.won": "所有小羊都进圈了。",
    "status.failed": "本关失败，重开再试。",
    "status.sheepEntered": "已入圈 {done}/{total}，继续清掉剩下的小羊。",
    "result.win.title": "成功入仓",
    "result.win.body": "顺序正确，所有小羊都安全进入羊圈。",
    "result.fail.title": "失败",
    "fail.wrongTarget": "点错了。本关只能点小羊。",
    "fail.missed": "点空了。本关点错立即失败。",
    "fail.blocked": "路线被挡住了。",
    "fail.blockedBySheep": "前方有别的小羊挡路。",
    "fail.blockedByObstacle": "前方有树篱或草垛挡路。",
    "fail.notAligned": "小羊没有正对羊仓。",
    "level.001.title": "第一只羊",
    "level.002.title": "回头路",
    "level.003.title": "向北回家",
    "level.004.title": "草坡下行",
    "level.005.title": "长路入仓"
  },
  en: {
    "app.title": "Sheep Run",
    "app.subtitle": "Many directional sheep. One candy pasture pen.",
    "button.start": "Start",
    "button.retry": "Retry",
    "button.next": "Next",
    "button.menu": "Menu",
    "button.language": "Language",
    "button.mute": "Mute",
    "button.sound": "Sound",
    "menu.levels": "Levels",
    "objective.default": "Follow each sheep's arrow. A blocked path fails.",
    "status.ready": "{done}/{total} sheep penned. Pick a clear sheep.",
    "status.moving": "Sheep is running to the pen...",
    "status.won": "All sheep are inside the pen.",
    "status.failed": "Level failed. Retry when ready.",
    "status.sheepEntered": "{done}/{total} sheep penned. Keep clearing the flock.",
    "result.win.title": "Barn Reached",
    "result.win.body": "Correct order. Every sheep made it into the pen.",
    "result.fail.title": "Failed",
    "fail.wrongTarget": "Wrong tap. This level only accepts the sheep.",
    "fail.missed": "Missed tap. Any wrong tap fails.",
    "fail.blocked": "The path is blocked.",
    "fail.blockedBySheep": "Another sheep is blocking the path.",
    "fail.blockedByObstacle": "A tree or hay bale is blocking the path.",
    "fail.notAligned": "This sheep is not lined up with a clean exit.",
    "level.001.title": "First Sheep",
    "level.002.title": "Turn Back",
    "level.003.title": "Northbound",
    "level.004.title": "Down the Field",
    "level.005.title": "Long Walk"
  },
  ja: {
    "app.title": "ひつじラン",
    "app.subtitle": "向きの違うひつじたちを、一つの柵へ。",
    "button.start": "スタート",
    "button.retry": "リトライ",
    "button.next": "次へ",
    "button.menu": "メニュー",
    "button.language": "言語",
    "button.mute": "ミュート",
    "button.sound": "サウンド",
    "menu.levels": "レベル",
    "objective.default": "ひつじの向きに進みます。前が詰まると失敗。",
    "status.ready": "{done}/{total} 匹が柵へ。道が空いたひつじを選ぼう。",
    "status.moving": "ひつじが柵へ走っています...",
    "status.won": "すべてのひつじが柵に入りました。",
    "status.failed": "失敗しました。もう一度どうぞ。",
    "status.sheepEntered": "{done}/{total} 匹が柵へ。残りも片付けよう。",
    "result.win.title": "小屋に到着",
    "result.win.body": "正しい順番です。すべてのひつじが柵に入りました。",
    "result.fail.title": "失敗",
    "fail.wrongTarget": "間違ったタップです。このレベルではひつじだけです。",
    "fail.missed": "空振りです。間違えると失敗です。",
    "fail.blocked": "道がふさがっています。",
    "fail.blockedBySheep": "前に別のひつじがいます。",
    "fail.blockedByObstacle": "木や干し草が道をふさいでいます。",
    "fail.notAligned": "ひつじが小屋の方向を向いていません。",
    "level.001.title": "最初のひつじ",
    "level.002.title": "戻る道",
    "level.003.title": "北へ",
    "level.004.title": "草原を下る",
    "level.005.title": "長い道"
  }
};

export class Localization {
  private locale: Locale;

  constructor() {
    const stored = localStorage.getItem("sheepRun.locale") as Locale | null;
    this.locale = stored && localeOrder.includes(stored) ? stored : detectLocale();
  }

  get current(): Locale {
    return this.locale;
  }

  t(key: string): string {
    return tables[this.locale][key] ?? tables.en[key] ?? key;
  }

  cycle(): Locale {
    const index = localeOrder.indexOf(this.locale);
    this.locale = localeOrder[(index + 1) % localeOrder.length];
    localStorage.setItem("sheepRun.locale", this.locale);
    document.documentElement.lang = this.locale;
    return this.locale;
  }
}

function detectLocale(): Locale {
  const language = navigator.language;
  if (language.startsWith("zh")) {
    return "zh-CN";
  }

  if (language.startsWith("ja")) {
    return "ja";
  }

  return "en";
}
