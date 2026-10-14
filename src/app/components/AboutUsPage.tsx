import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { callEdgeFunction } from '../../lib/supabaseClient';
import {
  DEFAULT_ABOUT_US_CONTENT,
  type AboutUsContent,
  type AboutUsTextBlock,
} from './AboutUsEditor';

function adaptColor(color: string): string {
  if (color.includes('#ff6b35') || color.includes('ff6b')) return 'text-[#111111]';
  if (color.includes('text-white')) return 'text-[#111111]';
  if (color.includes('text-gray')) return 'text-[#6B7280]';
  if (color.includes('text-black')) return 'text-[#111111]';
  return color;
}

function renderInlineBlocks(
  blocks: AboutUsTextBlock[],
  options: { headingTag?: 'h1' | 'h2' } = {},
) {
  const { headingTag = 'h1' } = options;
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
        className={`w-full text-left tracking-tight ${
          lineIdx > 0 ? 'mt-3 sm:mt-4' : ''
        }`}
      >
        {line.map((block, idx) => (
          <span
            key={idx}
            className={`${block.fontSize} ${block.fontWeight} ${adaptColor(block.color)} break-words`}
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
    <div key={idx} className="w-full text-left text-[#111111]">
      <p className="mb-5 text-sm font-semibold tracking-wide uppercase text-[#6B7280]">{heading}</p>
      <ul className="flex flex-wrap justify-start gap-2">
        {members.map((name) => (
          <li
            key={name}
            className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-2 text-sm font-medium text-[#111111]"
          >
            {name}
          </li>
        ))}
      </ul>
      {footnotes.map((note, noteIdx) => (
        <p key={noteIdx} className="mt-4 text-xs font-normal text-[#6B7280] leading-[1.6]">
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
      className={`${block.fontSize} font-normal ${adaptColor(block.color)} w-full text-left leading-[1.6] break-words`}
    >
      {lines.map((line, lineIdx) => {
        if (lineIdx === 0 && hasHeadingLine) {
          return (
            <p key={lineIdx} className="mb-3 text-sm font-semibold tracking-wide uppercase text-[#6B7280]">
              {line}
            </p>
          );
        }

        if (line.trimStart().startsWith('*')) {
          return (
            <p key={lineIdx} className="mt-3 text-xs font-normal text-[#6B7280]">
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
    <div className="min-h-screen overflow-x-hidden bg-white">
      <section className="bg-white px-8 py-16 sm:px-12 sm:py-20 md:px-16 md:py-24 lg:px-24">
        <div className="mx-auto w-full max-w-3xl text-left">
          <span className="mb-8 block text-xs font-medium uppercase tracking-[0.22em] text-[#6B7280]">
            {t('About Us', '关于我们')}
          </span>
          <div className="space-y-1">{renderInlineBlocks(heroBlocks)}</div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-3xl px-8 pb-16 sm:px-12 sm:pb-20 md:px-16 lg:px-0">
        {content.sections.map((section, sectionIdx) => {
          const paragraphs = language === 'en' ? section.paragraphsEn : section.paragraphsCn;
          const title = language === 'en' ? section.titleEn : section.titleCn;

          return (
            <section
              key={section.id}
              className={`w-full py-12 text-left sm:py-14 ${
                sectionIdx > 0 ? 'border-t border-[#E5E7EB]' : ''
              }`}
            >
              <span className="mb-3 block text-xs font-medium uppercase tracking-[0.2em] text-[#6B7280]">
                {String(sectionIdx + 1).padStart(2, '0')}
              </span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#111111] break-words leading-tight">
                {title}
              </h2>
              <div className="mt-8 space-y-6">
                {paragraphs.map((block, idx) => renderParagraph(block, idx, section.id))}
              </div>
            </section>
          );
        })}
      </div>

      <section className="bg-[#F8F9FA] px-8 py-16 sm:px-12 sm:py-20 md:px-16 lg:px-24">
        <div className="mx-auto w-full max-w-3xl text-left">
          {renderInlineBlocks(thankYouBlocks, { headingTag: 'h2' })}
        </div>
      </section>
    </div>
  );
}
