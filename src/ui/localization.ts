export type Locale = "zh-CN" | "en" | "ja";

const localeOrder: Locale[] = ["zh-CN", "en", "ja"];

const tables: Record<Locale, Record<string, string>> = {
  "zh-CN": {
    "app.title": "赶了个羊",
    "app.subtitle": "只有一只羊，只有一个羊仓。点错就失败。",
    "button.start": "开始",
    "button.retry": "重开",
    "button.next": "下一关",
    "button.menu": "菜单",
    "button.language": "语言",
    "button.mute": "静音",
    "button.sound": "声音",
    "menu.levels": "关卡",
    "objective.default": "观察路线，只点小羊。",
    "status.ready": "点小羊，把它赶进羊仓。",
    "status.moving": "小羊进仓中...",
    "status.won": "小羊已经安全入仓。",
    "status.failed": "本关失败，重开再试。",
    "result.win.title": "成功入仓",
    "result.win.body": "路线正确，小羊安全回到羊仓。",
    "result.fail.title": "失败",
    "fail.wrongTarget": "点错了。本关只能点小羊。",
    "fail.missed": "点空了。本关点错立即失败。",
    "fail.blocked": "路线被挡住了。",
    "fail.notAligned": "小羊没有正对羊仓。",
    "level.001.title": "第一只羊",
    "level.002.title": "回头路",
    "level.003.title": "向北回家",
    "level.004.title": "草坡下行",
    "level.005.title": "长路入仓"
  },
  en: {
    "app.title": "Sheep Run",
    "app.subtitle": "One sheep, one barn. Any wrong tap fails.",
    "button.start": "Start",
    "button.retry": "Retry",
    "button.next": "Next",
    "button.menu": "Menu",
    "button.language": "Language",
    "button.mute": "Mute",
    "button.sound": "Sound",
    "menu.levels": "Levels",
    "objective.default": "Read the path. Tap only the sheep.",
    "status.ready": "Tap the sheep and guide it into the barn.",
    "status.moving": "Sheep is heading home...",
    "status.won": "The sheep is safely inside the barn.",
    "status.failed": "Level failed. Retry when ready.",
    "result.win.title": "Barn Reached",
    "result.win.body": "Correct path. The sheep made it home.",
    "result.fail.title": "Failed",
    "fail.wrongTarget": "Wrong tap. This level only accepts the sheep.",
    "fail.missed": "Missed tap. Any wrong tap fails.",
    "fail.blocked": "The path is blocked.",
    "fail.notAligned": "The sheep is not lined up with the barn.",
    "level.001.title": "First Sheep",
    "level.002.title": "Turn Back",
    "level.003.title": "Northbound",
    "level.004.title": "Down the Field",
    "level.005.title": "Long Walk"
  },
  ja: {
    "app.title": "ひつじラン",
    "app.subtitle": "ひつじは一匹、小屋も一つ。間違えると失敗。",
    "button.start": "スタート",
    "button.retry": "リトライ",
    "button.next": "次へ",
    "button.menu": "メニュー",
    "button.language": "言語",
    "button.mute": "ミュート",
    "button.sound": "サウンド",
    "menu.levels": "レベル",
    "objective.default": "道を見て、ひつじだけをタップ。",
    "status.ready": "ひつじをタップして小屋へ帰そう。",
    "status.moving": "ひつじが小屋へ向かっています...",
    "status.won": "ひつじが無事に小屋へ入りました。",
    "status.failed": "失敗しました。もう一度どうぞ。",
    "result.win.title": "小屋に到着",
    "result.win.body": "正しい道です。ひつじが帰りました。",
    "result.fail.title": "失敗",
    "fail.wrongTarget": "間違ったタップです。このレベルではひつじだけです。",
    "fail.missed": "空振りです。間違えると失敗です。",
    "fail.blocked": "道がふさがっています。",
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
