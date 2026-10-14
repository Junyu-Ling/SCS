import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { callEdgeFunction } from '../../lib/supabaseClient';
import { OptimizedImage } from './OptimizedImage';
import heroImage from 'figma:asset/category-about-us.jpg';
import {
  DEFAULT_ABOUT_US_CONTENT,
  type AboutUsContent,
  type AboutUsTextBlock,
} from './AboutUsEditor';

type Tone = 'light' | 'dark';

/** 文字内容与编辑器数据保持不变，这里只把颜色映射成适配当前底色的主题色 */
function adaptColor(color: string, tone: Tone): string {
  const isAccent = color.includes('#ff6b35') || color.includes('ff6b');
  if (tone === 'dark') {
    if (isAccent) return 'text-[#A8D5C2]';
    if (color.includes('text-gray')) return 'text-white/80';
    if (color.includes('text-black') || color.includes('text-white')) return 'text-white';
    return color;
  }
  if (isAccent) return 'text-[#174D3D]';
  if (color.includes('text-white')) return 'text-black';
  if (color.includes('text-gray')) return 'text-[#4A5E55]';
  if (color.includes('text-black')) return 'text-black';
  return color;
}

function renderInlineBlocks(
  blocks: AboutUsTextBlock[],
  options: {
    headingTag?: 'h1' | 'h2';
    tone?: Tone;
    align?: 'left' | 'center';
    sizeOverride?: string;
  } = {},
) {
  const { headingTag = 'h1', tone = 'light', align = 'left', sizeOverride } = options;
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
        className={`w-full ${align === 'center' ? 'text-center' : 'text-left'} ${
          lineIdx > 0 ? 'mt-3 sm:mt-4' : ''
        }`}
      >
        {line.map((block, idx) => (
          <span key={idx}>
            <span
              className={`${sizeOverride ?? block.fontSize} ${block.fontWeight} ${adaptColor(
                block.color,
                tone,
              )} break-words leading-[1.15]`}
            >
              {block.text}
            </span>
            {/* 句号后紧跟下一句时另起一行，避免 "SCS.Together" 粘连 */}
            {idx < line.length - 1 && /[.。]$/.test(block.text.trim()) && !/^\s/.test(line[idx + 1].text) && (
              <br />
            )}
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

function renderMemberList(block: AboutUsTextBlock, idx: number, tone: Tone) {
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

  const dark = tone === 'dark';

  return (
    <div
      key={idx}
      className={`w-full rounded-2xl border p-6 text-left sm:p-7 ${
        dark ? 'border-white/15 bg-white/[0.06]' : 'border-[#D6E2DC] bg-white'
      }`}
    >
      <p
        className={`mb-5 text-xs font-semibold uppercase tracking-[0.18em] ${
          dark ? 'text-[#A8D5C2]' : 'text-[#174D3D]'
        }`}
      >
        {heading}
      </p>
      <ul className="flex flex-wrap justify-start gap-2">
        {members.map((name) => (
          <li
            key={name}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              dark
                ? 'border-white/20 bg-white/10 text-white'
                : 'border-[#D6E2DC] bg-[#F4F8F6] text-black'
            }`}
          >
            {name}
          </li>
        ))}
      </ul>
      {footnotes.map((note, noteIdx) => (
        <p
          key={noteIdx}
          className={`mt-5 text-xs font-normal leading-[1.6] ${
            dark ? 'text-white/60' : 'text-[#4A5E55]'
          }`}
        >
          {note}
        </p>
      ))}
    </div>
  );
}

function renderParagraph(
  block: AboutUsTextBlock,
  idx: number,
  tone: Tone,
  sectionId?: string,
) {
  if (sectionId === 'team' && isMemberListBlock(block.text)) {
    return renderMemberList(block, idx, tone);
  }

  const dark = tone === 'dark';
  const lines = block.text.split('\n');
  const hasHeadingLine = Boolean(lines[0]) && (lines[0].endsWith(':') || lines[0].endsWith('：'));
  const isEmphasis = block.fontWeight.includes('black') || block.fontWeight.includes('bold');

  const body = lines.map((line, lineIdx) => {
    if (lineIdx === 0 && hasHeadingLine) {
      return (
        <p
          key={lineIdx}
          className={`mb-3 text-xs font-semibold uppercase tracking-[0.18em] ${
            dark ? 'text-[#A8D5C2]' : 'text-[#174D3D]'
          }`}
        >
          {line}
        </p>
      );
    }

    if (line.trimStart().startsWith('*')) {
      return (
        <p
          key={lineIdx}
          className={`mt-3 text-xs font-normal ${dark ? 'text-white/60' : 'text-[#4A5E55]'}`}
        >
          {line}
        </p>
      );
    }

    return (
      <p key={lineIdx} className={lineIdx > 0 && !(lineIdx === 1 && hasHeadingLine) ? 'mt-4' : ''}>
        {line}
      </p>
    );
  });

  // 加粗的重点段落做成带竖线的引述块，其余为正文
  if (isEmphasis) {
    return (
      <div
        key={idx}
        className={`w-full border-l-2 py-1 pl-5 text-left text-lg font-semibold leading-[1.7] break-words ${
          dark ? 'border-[#A8D5C2]' : 'border-[#174D3D]'
        } ${adaptColor(block.color, tone)}`}
      >
        {body}
      </div>
    );
  }

  return (
    <div
      key={idx}
      className={`${block.fontSize} font-normal ${adaptColor(
        block.color,
        tone,
      )} w-full text-left leading-[1.75] break-words`}
    >
      {body}
    </div>
  );
}

const SECTION_THEMES: {
  bg: string;
  tone: Tone;
  number: string;
  title: string;
  rule: string;
}[] = [
  { bg: 'bg-white', tone: 'light', number: 'text-[#174D3D]/20', title: 'text-black', rule: 'bg-[#174D3D]' },
  { bg: 'bg-[#EEF4F1]', tone: 'light', number: 'text-[#174D3D]/20', title: 'text-black', rule: 'bg-[#174D3D]' },
  { bg: 'bg-[#174D3D]', tone: 'dark', number: 'text-white/25', title: 'text-white', rule: 'bg-[#A8D5C2]' },
];

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
  const gutter = 'px-[clamp(1.25rem,6vw,6rem)]';
  const inner = 'mx-auto w-full max-w-6xl';

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      {/* Hero：深绿底 + 大标题 + 右侧照片 */}
      <section className={`relative overflow-hidden bg-[#174D3D] ${gutter} py-16 sm:py-20 lg:py-28`}>
        <div className="pointer-events-none absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-[20rem] w-[20rem] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-white/[0.04]" />

        <div className={`${inner} relative grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20`}>
          <div>
            <div className="mb-8 flex items-center gap-4">
              <span className="h-px w-12 bg-[#A8D5C2]" />
              <span className="text-xs font-medium uppercase tracking-[0.28em] text-[#A8D5C2]">
                {t('About Us', '关于我们')}
              </span>
            </div>
            <div className="space-y-1">
              {renderInlineBlocks(heroBlocks, {
                tone: 'dark',
                sizeOverride: 'text-4xl sm:text-5xl lg:text-6xl',
              })}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:ml-auto lg:mr-0">
            <div className="pointer-events-none absolute inset-0 translate-x-4 translate-y-4 rounded-[2rem] border border-white/25" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-2xl shadow-black/30">
              <OptimizedImage
                src={heroImage}
                alt={t('About Us', '关于我们')}
                priority={true}
                wrapperClassName="absolute inset-0 h-full w-full"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* 内容分区：白 / 浅绿 / 深绿 交替，左侧编号 + 标题，右侧正文 */}
      {content.sections.map((section, sectionIdx) => {
        const paragraphs = language === 'en' ? section.paragraphsEn : section.paragraphsCn;
        const title = language === 'en' ? section.titleEn : section.titleCn;
        const theme = SECTION_THEMES[sectionIdx % SECTION_THEMES.length];

        return (
          <section
            key={section.id}
            className={`${theme.bg} ${gutter} py-16 sm:py-20 lg:py-24`}
          >
            <div className={`${inner} grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20`}>
              <div className="lg:sticky lg:top-[calc(10vh+2rem)] lg:self-start">
                <span
                  className={`block text-6xl font-semibold leading-none tracking-tight sm:text-7xl ${theme.number}`}
                >
                  {String(sectionIdx + 1).padStart(2, '0')}
                </span>
                <span className={`mt-6 block h-[3px] w-12 rounded-full ${theme.rule}`} />
                <h2
                  className={`mt-6 break-words text-3xl font-semibold leading-tight sm:text-4xl ${theme.title}`}
                >
                  {title}
                </h2>
              </div>

              <div className="flex flex-col gap-6">
                {paragraphs.map((block, idx) => renderParagraph(block, idx, theme.tone, section.id))}
              </div>
            </div>
          </section>
        );
      })}

      {/* 结尾：黑底居中致谢 */}
      <section className={`relative overflow-hidden bg-black ${gutter} py-20 sm:py-28`}>
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="relative mx-auto max-w-3xl">
          <span className="mx-auto mb-10 block h-px w-12 bg-[#A8D5C2]" />
          {renderInlineBlocks(thankYouBlocks, { headingTag: 'h2', tone: 'dark', align: 'center' })}
        </div>
      </section>
    </div>
  );
}
