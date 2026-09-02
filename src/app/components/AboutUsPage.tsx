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
 */
function renderInlineBlocks(blocks: AboutUsTextBlock[]) {
  const lines: AboutUsTextBlock[][] = [[]];
  for (const block of blocks) {
    if (block.text === '\n') {
      lines.push([]);
    } else {
      lines[lines.length - 1].push(block);
    }
  }

  return lines.map((line, lineIdx) => (
    <h1
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
    </h1>
  ));
}

function renderParagraph(block: AboutUsTextBlock, idx: number) {
  const lines = block.text.split('\n');
  const isFirstLineBold = lines[0] && (lines[0].endsWith(':') || lines[0].endsWith('：'));

  return (
    <div
      key={idx}
      className={`${block.fontSize} ${block.fontWeight} ${block.color} leading-relaxed break-words`}
    >
      {lines.map((line, lineIdx) => (
        <p
          key={lineIdx}
          className={
            lineIdx === 0 && isFirstLineBold
              ? 'font-black text-inherit mb-2'
              : lineIdx > 0
                ? 'mt-0.5'
                : ''
          }
        >
          {line}
        </p>
      ))}
    </div>
  );
}

export default function AboutUsPage() {
  const { language } = useLanguage();
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
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Hero：小屏纵向排列，绿区 min-w-0 + 换行防止溢出 */}
      <div className="relative flex flex-col md:flex-row w-full min-h-[240px] md:min-h-[280px] md:h-[40vh] overflow-hidden">
        <div className="h-3 md:h-auto md:w-1/2 bg-black shrink-0 md:min-h-0" aria-hidden />
        <div className="w-full md:w-1/2 bg-[#d4e4d8] flex items-center justify-center px-3 py-8 sm:px-6 sm:py-10 md:py-8 md:px-6 lg:px-10 min-w-0 flex-1">
          <div className="w-full max-w-xl ml-0 md:ml-auto text-center md:text-right min-w-0">
            {renderInlineBlocks(heroBlocks)}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16 py-12 sm:py-16 space-y-16 sm:space-y-20">
        {content.sections.map((section) => {
          const paragraphs = language === 'en' ? section.paragraphsEn : section.paragraphsCn;
          const title = language === 'en' ? section.titleEn : section.titleCn;

          return (
            <section key={section.id} className="min-w-0">
              <h2
                className={`${section.titleSize} mb-6 sm:mb-8 ${section.titleColor} break-words px-1 ${section.id === 'team' ? '' : 'text-center'}`}
              >
                {title}
              </h2>
              <div className={`space-y-6 min-w-0 ${section.id === 'team' ? '' : 'text-center'}`}>
                {paragraphs.map((block, idx) => renderParagraph(block, idx))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="w-full bg-black py-8 px-4 sm:px-8 md:px-16 lg:px-32 overflow-x-hidden">
        <div className="max-w-4xl mx-auto text-center min-w-0">
          {renderInlineBlocks(thankYouBlocks)}
        </div>
      </div>

    </div>
  );
}
