import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { callEdgeFunction } from '../../lib/supabaseClient';
import {
  DEFAULT_ABOUT_US_CONTENT,
  type AboutUsContent,
  type AboutUsTextBlock,
} from './AboutUsEditor';

/**
 * 渲染内联文本块数组（用于 Hero 和 Thank You 区域）
 * 首行用 headingTag 承载标题语义，其余行用 div，避免一页出现多个 h1
 */
function renderInlineBlocks(blocks: AboutUsTextBlock[], headingTag: 'h1' | 'h2' = 'h1') {
  const lines: AboutUsTextBlock[][] = [[]];
  for (const block of blocks) {
    if (block.text === '\n') {
      lines.push([]);
    } else {
      lines[lines.length - 1].push(block);
    }
  }

  return lines.map((line, lineIdx) => {
    const Tag = lineIdx === 0 ? headingTag : 'div';
    return (
      <Tag
        key={lineIdx}
        className={`leading-tight tracking-tight ${lineIdx > 0 ? 'mt-2 sm:mt-3' : ''}`}
      >
        {line.map((block, idx) => (
          <span
            key={idx}
            className={`${block.fontSize} ${block.fontWeight} ${block.color} break-words`}
          >
            {block.text}
          </span>
        ))}
      </Tag>
    );
  });
}

function renderParagraph(block: AboutUsTextBlock, idx: number) {
  const lines = block.text.split('\n');
  const hasHeadingLine = Boolean(lines[0]) && (lines[0].endsWith(':') || lines[0].endsWith('：'));

  return (
    <div
      key={idx}
      className={`${block.fontSize} ${block.fontWeight} ${block.color} leading-relaxed break-words`}
    >
      {lines.map((line, lineIdx) => {
        if (lineIdx === 0 && hasHeadingLine) {
          return (
            <p key={lineIdx} className="font-black text-inherit tracking-wide mb-3">
              {line}
            </p>
          );
        }

        // 以 * 开头的行是排名说明一类的脚注，降级为小字弱化显示
        if (line.trimStart().startsWith('*')) {
          return (
            <p key={lineIdx} className="mt-3 text-xs sm:text-sm font-normal text-gray-500">
              {line}
            </p>
          );
        }

        return (
          <p key={lineIdx} className={lineIdx > 0 ? 'mt-1' : ''}>
            {line}
          </p>
        );
      })}
    </div>
  );
}

export default function AboutUsPage() {
  const { language, t } = useLanguage();
  const [content, setContent] = useState<AboutUsContent>(DEFAULT_ABOUT_US_CONTENT);

  const fetchContent = useCallback(async () => {
    try {
      const res = await callEdgeFunction('/aboutus-content', { method: 'GET', requireAuth: false });
      if (res?.content) {
        setContent(res.content);
      }
    } catch (e) {
      console.error('[ABOUTUS] Failed to load content, using defaults:', e);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const heroBlocks = language === 'en' ? content.heroEn : content.heroCn;
  const thankYouBlocks = language === 'en' ? content.thankYouEn : content.thankYouCn;

  return (
    <div className="min-h-screen bg-[#f6faf7] overflow-x-hidden">
      {/* Hero：全宽浅绿渐变，文字居中；深色/橙色文案在浅底上保持可读 */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#c9e0d1] via-[#dcebe1] to-[#f6faf7] px-4 py-14 sm:px-6 sm:py-20 md:py-24">
        <div
          className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-[#ff6b35]/[0.07] blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto flex max-w-3xl min-w-0 flex-col items-center text-center">
          <span className="mb-5 inline-flex items-center rounded-full border border-primary/20 bg-white/70 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary backdrop-blur sm:mb-7 sm:text-sm">
            {t('About Us', '关于我们')}
          </span>
          <div className="w-full min-w-0">{renderInlineBlocks(heroBlocks)}</div>
          <span className="mt-7 block h-1 w-16 rounded-full bg-[#ff6b35] sm:mt-9" aria-hidden />
        </div>
      </section>

      {/* 正文：白色卡片承载各板块，标题与段落全部居中 */}
      <div className="mx-auto max-w-4xl space-y-8 px-4 pb-12 pt-10 sm:space-y-10 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8">
        {content.sections.map((section) => {
          const paragraphs = language === 'en' ? section.paragraphsEn : section.paragraphsCn;
          const title = language === 'en' ? section.titleEn : section.titleCn;

          return (
            <section
              key={section.id}
              className="min-w-0 rounded-3xl border border-primary/10 bg-white px-5 py-9 shadow-[0_18px_50px_-32px_rgba(23,77,61,0.45)] transition-shadow duration-300 hover:shadow-[0_22px_60px_-30px_rgba(23,77,61,0.5)] sm:px-10 sm:py-12"
            >
              <h2
                className={`${section.titleSize} ${section.titleColor} break-words px-1 text-center leading-tight`}
              >
                {title}
              </h2>
              <span
                className="mx-auto mb-7 mt-5 block h-1 w-12 rounded-full bg-[#ff6b35]/70 sm:mb-8"
                aria-hidden
              />
              <div className="mx-auto min-w-0 max-w-2xl space-y-6 text-center">
                {paragraphs.map((block, idx) => renderParagraph(block, idx))}
              </div>
            </section>
          );
        })}
      </div>

      {/* 结尾致谢：沿用站点深绿渐变，承载白色/橙色文案 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f3a2e] via-primary to-[#20614d] px-4 py-14 text-white sm:px-8 sm:py-20">
        <div
          className="pointer-events-none absolute -top-20 right-0 h-64 w-64 rounded-full bg-[#ff6b35]/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-secondary/20 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto min-w-0 max-w-3xl text-center">
          {renderInlineBlocks(thankYouBlocks, 'h2')}
        </div>
      </section>
    </div>
  );
}
