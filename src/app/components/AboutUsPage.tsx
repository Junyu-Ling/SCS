import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { callEdgeFunction } from '../../lib/supabaseClient';
import {
  DEFAULT_ABOUT_US_CONTENT,
  type AboutUsContent,
  type AboutUsTextBlock,
} from './AboutUsEditor';

const ACCENT = '#ff6b35';

function adaptColorForSurface(color: string, onDark: boolean): string {
  if (!onDark) return color;
  if (color.includes('text-black') || color.includes('text-gray')) return 'text-white/90';
  return color;
}

/**
 * 渲染内联文本块（Hero / Thank You）
 */
function renderInlineBlocks(
  blocks: AboutUsTextBlock[],
  options: { headingTag?: 'h1' | 'h2'; onDark?: boolean } = {},
) {
  const { headingTag = 'h1', onDark = false } = options;
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
        className={`mx-auto w-full max-w-2xl text-center leading-tight tracking-tight ${
          lineIdx > 0 ? 'mt-3 sm:mt-4' : ''
        }`}
      >
        {line.map((block, idx) => (
          <span
            key={idx}
            className={`${block.fontSize} ${block.fontWeight} ${adaptColorForSurface(block.color, onDark)} break-words`}
          >
            {block.text}
          </span>
        ))}
      </Tag>
    );
  });
}

function isMemberListBlock(text: string): boolean {
  const firstLine = text.split('\n')[0]?.trim() ?? '';
  return (
    firstLine.endsWith(':') ||
    firstLine.endsWith('：') ||
    /^(Current Members|Honored Members|现任成员|荣誉成员)/i.test(firstLine)
  );
}

function renderMemberList(block: AboutUsTextBlock, idx: number) {
  const lines = block.text.split('\n').filter((line) => line.trim() !== '');
  const heading = lines[0] ?? '';
  const members: string[] = [];
  const footnotes: string[] = [];

  for (const line of lines.slice(1)) {
    if (line.trimStart().startsWith('*')) {
      footnotes.push(line);
    } else {
      members.push(line.trim());
    }
  }

  return (
    <div
      key={idx}
      className={`${block.fontSize} ${block.fontWeight} ${block.color} mx-auto w-full max-w-xl text-center`}
    >
      <p className="mb-4 font-black tracking-wide text-inherit">{heading}</p>
      <ul className="mx-auto flex max-w-lg flex-wrap justify-center gap-2.5 sm:gap-3">
        {members.map((name) => (
          <li
            key={name}
            className="rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-medium text-primary sm:text-base"
          >
            {name}
          </li>
        ))}
      </ul>
      {footnotes.map((note, noteIdx) => (
        <p key={noteIdx} className="mt-4 text-xs font-normal text-gray-500 sm:text-sm">
          {note}
        </p>
      ))}
    </div>
  );
}

function renderParagraph(block: AboutUsTextBlock, idx: number, sectionId?: string) {
  if (sectionId === 'team' && isMemberListBlock(block.text)) {
    return renderMemberList(block, idx);
  }

  const lines = block.text.split('\n');
  const hasHeadingLine = Boolean(lines[0]) && (lines[0].endsWith(':') || lines[0].endsWith('：'));

  return (
    <div
      key={idx}
      className={`${block.fontSize} ${block.fontWeight} ${block.color} mx-auto w-full max-w-xl text-center leading-relaxed break-words`}
    >
      {lines.map((line, lineIdx) => {
        if (lineIdx === 0 && hasHeadingLine) {
          return (
            <p key={lineIdx} className="mb-3 font-black tracking-wide text-inherit">
              {line}
            </p>
          );
        }

        if (line.trimStart().startsWith('*')) {
          return (
            <p key={lineIdx} className="mt-3 text-xs font-normal text-gray-500 sm:text-sm">
              {line}
            </p>
          );
        }

        return (
          <p key={lineIdx} className={lineIdx > 0 ? 'mt-1.5' : ''}>
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
    <div className="min-h-screen overflow-x-hidden bg-[#f3f7f4]">
      {/* Hero：纯色品牌背景，文案全居中 */}
      <section className="flex flex-col items-center bg-primary px-4 py-16 text-white sm:px-6 sm:py-20 md:py-24">
        <div className="mx-auto w-full max-w-3xl text-center">
          <span className="mb-6 inline-flex items-center rounded-full border border-white/25 bg-white/10 px-5 py-1.5 text-xs font-medium uppercase tracking-[0.25em] text-white/95 backdrop-blur-sm sm:mb-8 sm:text-sm">
            {t('About Us', '关于我们')}
          </span>

          <div className="space-y-1">{renderInlineBlocks(heroBlocks, { onDark: true })}</div>

          <span
            className="mx-auto mt-8 block h-1 w-14 rounded-full sm:mt-10"
            style={{ backgroundColor: ACCENT }}
            aria-hidden
          />
        </div>
      </section>

      {/* 正文：单列居中，卡片统一宽度 */}
      <div className="flex w-full flex-col items-center space-y-8 px-4 py-12 sm:space-y-10 sm:px-6 sm:py-16 lg:px-8">
        {content.sections.map((section, sectionIdx) => {
          const paragraphs = language === 'en' ? section.paragraphsEn : section.paragraphsCn;
          const title = language === 'en' ? section.titleEn : section.titleCn;
          const isTeam = section.id === 'team';

          return (
            <section
              key={section.id}
              className="w-full max-w-3xl rounded-3xl border border-white/80 bg-white px-6 py-10 text-center shadow-[0_20px_60px_-40px_rgba(23,77,61,0.55)] sm:px-10 sm:py-12"
            >
              <div className="mx-auto w-full max-w-2xl">
                <span className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary/60">
                  {String(sectionIdx + 1).padStart(2, '0')}
                </span>
                <h2
                  className={`${section.titleSize} ${isTeam ? 'text-[#ff6b35]' : 'text-primary'} break-words leading-tight`}
                >
                  {title}
                </h2>
                <span
                  className="mx-auto my-6 block h-1 w-12 rounded-full sm:my-7"
                  style={{ backgroundColor: ACCENT }}
                  aria-hidden
                />
                <div className="space-y-7 sm:space-y-8">
                  {paragraphs.map((block, idx) => renderParagraph(block, idx, section.id))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* 结尾致谢 */}
      <section className="flex flex-col items-center bg-[#102f27] px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="mx-auto w-full max-w-3xl text-center">
          {renderInlineBlocks(thankYouBlocks, { headingTag: 'h2', onDark: true })}
        </div>
      </section>
    </div>
  );
}
