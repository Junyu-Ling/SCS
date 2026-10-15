// 与前端 LanguageContext 同一套：'en' | 'cn'，未指定时默认英文。

export type Lang = 'en' | 'cn';

export function tr(lang: Lang, en: string, cn: string): string {
  return lang === 'cn' ? cn : en;
}

/** 从 X-Lang 请求头读取当前界面语言。缺省为英文，与 localStorage `lang` 的默认值一致。 */
export function requestLang(req: any): Lang {
  const header = req?.headers?.['x-lang'];
  const raw = Array.isArray(header) ? header[0] : header;
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (value === 'cn' || value === 'zh' || value === 'zh-cn') return 'cn';
  return 'en';
}
