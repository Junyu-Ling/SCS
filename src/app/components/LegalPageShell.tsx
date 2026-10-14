import type { ReactNode } from 'react';

// 注意：base.css 里有 `div, p, a { margin: 0 }` 的旧规则，会让这些元素上的 mt-/mb- 失效，
// 所以这里的间距一律使用 padding / gap，或者落在不受影响的元素（section/article/ul/li/h*/span）上。

const GUTTER = 'px-[clamp(1.25rem,6vw,6rem)]';
const INNER = 'mx-auto w-full max-w-6xl';

type LegalPageShellProps = {
  title: string;
  subtitle?: string;
  metaLines?: string[];
  notice?: string;
  children: ReactNode;
};

export function LegalPageShell({
  title,
  subtitle,
  metaLines,
  notice,
  children,
}: LegalPageShellProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-black">
      {/* 深绿头图：标题 + 元信息 */}
      <section className={`relative overflow-hidden bg-[#174D3D] ${GUTTER} py-14 sm:py-20`}>
        <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-14 -top-14 h-[18rem] w-[18rem] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-white/[0.04]" />

        <article className={`${INNER} relative`}>
          <span className="block h-[3px] w-12 rounded-full bg-[#A8D5C2]" />
          <h1 className="break-words pt-6 text-4xl font-semibold leading-[1.1] text-white sm:text-5xl">
            {title}
          </h1>

          {subtitle ? (
            <p className="max-w-2xl break-words pt-5 text-base leading-[1.7] text-white/75 sm:text-lg">
              {subtitle}
            </p>
          ) : null}

          {metaLines?.length ? (
            <ul className="flex flex-wrap gap-2 pt-7">
              {metaLines.map((line, i) => (
                <li
                  key={i}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white break-words"
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : null}

          {notice ? (
            <div className="max-w-3xl pt-6">
              <p className="break-words rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-4 text-xs leading-[1.7] text-white/70">
                {notice}
              </p>
            </div>
          ) : null}
        </article>
      </section>

      {/* 正文 */}
      <section className={`bg-white ${GUTTER} py-12 sm:py-16`}>
        <article className={INNER}>{children}</article>
      </section>
    </div>
  );
}

/** 开篇导语：浅绿底 + 深绿竖线 */
export function LegalIntro({ children }: { children: ReactNode }) {
  return (
    <div className="pb-10">
      <p className="break-words rounded-2xl border-l-4 border-[#174D3D] bg-[#EEF4F1] px-6 py-5 text-base leading-[1.8] text-[#2F4A3F] sm:text-[17px]">
        {children}
      </p>
    </div>
  );
}

/** 条款分节：左侧编号 + 标题（标题字符串形如 "1. Xxx"，自动拆出编号），右侧正文 */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  const match = title.match(/^(\d+)\.\s*(.*)$/);
  const number = match ? match[1].padStart(2, '0') : null;
  const name = match ? match[2] : title;

  return (
    <section className="grid gap-4 border-t border-[#D6E2DC] py-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
      <div className="lg:sticky lg:top-[calc(10vh+2rem)] lg:self-start">
        {number ? (
          <span className="block text-5xl font-semibold leading-none tracking-tight text-[#174D3D]/20">
            {number}
          </span>
        ) : null}
        <h2 className="break-words pt-4 text-xl font-semibold leading-snug text-black sm:text-2xl">
          {name}
        </h2>
      </div>
      <div className="flex flex-col gap-4 text-base leading-[1.8] text-[#4A5E55] sm:text-[17px]">
        {children}
      </div>
    </section>
  );
}

export function LegalText({ children }: { children: ReactNode }) {
  return <p className="break-words">{children}</p>;
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#174D3D]" />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}
