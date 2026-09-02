import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2, Save, X } from 'lucide-react';

/**
 * About Us 内容数据结构
 * 每个 section 包含中英文内容，每个内容是段落数组
 */
export interface AboutUsTextBlock {
  text: string;
  fontSize: string;    // e.g. 'text-lg', 'text-xl', 'text-2xl'
  fontWeight: string;  // e.g. 'font-normal', 'font-bold', 'font-black'
  color: string;       // e.g. 'text-gray-700', 'text-black', 'text-[#ff6b35]'
}

export interface AboutUsSection {
  id: string;
  titleEn: string;
  titleCn: string;
  titleColor: string;  // Tailwind color class
  titleSize: string;   // Tailwind text size
  paragraphsEn: AboutUsTextBlock[];
  paragraphsCn: AboutUsTextBlock[];
}

export interface AboutUsContent {
  sections: AboutUsSection[];
  // Hero section
  heroEn: AboutUsTextBlock[];
  heroCn: AboutUsTextBlock[];
  // Thank you section
  thankYouEn: AboutUsTextBlock[];
  thankYouCn: AboutUsTextBlock[];
}

/** 保存前规范化，避免空字号等导致 Radix Select / 渲染异常或写入失败 */
export function sanitizeAboutUsContent(c: AboutUsContent): AboutUsContent {
  const normBlock = (b: Partial<AboutUsTextBlock> | undefined): AboutUsTextBlock => ({
    text: typeof b?.text === 'string' ? b.text : '',
    fontSize:
      typeof b?.fontSize === 'string' && b.fontSize.trim() !== '' ? b.fontSize : 'text-base',
    fontWeight:
      typeof b?.fontWeight === 'string' && b.fontWeight !== '' ? b.fontWeight : 'font-normal',
    color: typeof b?.color === 'string' && b.color !== '' ? b.color : 'text-gray-700',
  });

  const normSection = (s: AboutUsSection): AboutUsSection => ({
    id: typeof s.id === 'string' && s.id ? s.id : `section-${Date.now()}`,
    titleEn: typeof s.titleEn === 'string' ? s.titleEn : '',
    titleCn: typeof s.titleCn === 'string' ? s.titleCn : '',
    titleColor:
      typeof s.titleColor === 'string' && s.titleColor ? s.titleColor : 'text-gray-800',
    titleSize:
      typeof s.titleSize === 'string' && s.titleSize.trim() !== '' ? s.titleSize : 'text-4xl',
    paragraphsEn: Array.isArray(s.paragraphsEn) ? s.paragraphsEn.map(normBlock) : [],
    paragraphsCn: Array.isArray(s.paragraphsCn) ? s.paragraphsCn.map(normBlock) : [],
  });

  return {
    sections: Array.isArray(c.sections) ? c.sections.map(normSection) : [],
    heroEn: Array.isArray(c.heroEn) ? c.heroEn.map(normBlock) : [],
    heroCn: Array.isArray(c.heroCn) ? c.heroCn.map(normBlock) : [],
    thankYouEn: Array.isArray(c.thankYouEn) ? c.thankYouEn.map(normBlock) : [],
    thankYouCn: Array.isArray(c.thankYouCn) ? c.thankYouCn.map(normBlock) : [],
  };
}

// Font size options（完整 Tailwind class，可含响应式前缀如 md:text-5xl）
const FONT_SIZES = [
  { value: 'text-sm', label: 'Small (14px)' },
  { value: 'text-base', label: 'Base (16px)' },
  { value: 'text-lg', label: 'Large (18px)' },
  { value: 'text-xl', label: 'XL (20px)' },
  { value: 'text-2xl', label: '2XL (24px)' },
  { value: 'text-3xl', label: '3XL (30px)' },
  { value: 'text-4xl', label: '4XL (36px)' },
  { value: 'text-5xl', label: '5XL (48px)' },
];

const FONT_SIZES_RESPONSIVE = [
  { value: 'text-2xl sm:text-3xl md:text-4xl', label: '响应式 2XL → 4XL' },
  { value: 'text-3xl sm:text-4xl md:text-5xl', label: '响应式 3XL → 5XL' },
  { value: 'text-4xl md:text-5xl', label: '4XL（md:5XL）' },
];

function getFontSizeOptions(current: string) {
  const all = [...FONT_SIZES_RESPONSIVE, ...FONT_SIZES];
  if (current && !all.some((x) => x.value === current)) {
    return [{ value: current, label: `当前: ${current}` }, ...all];
  }
  return all;
}

const FONT_WEIGHTS = [
  { value: 'font-normal', label: 'Normal' },
  { value: 'font-medium', label: 'Medium' },
  { value: 'font-semibold', label: 'Semibold' },
  { value: 'font-bold', label: 'Bold' },
  { value: 'font-black', label: 'Black' },
];

const COLORS = [
  { value: 'text-gray-700', label: 'Gray' },
  { value: 'text-gray-800', label: 'Dark Gray' },
  { value: 'text-black', label: 'Black' },
  { value: 'text-white', label: 'White' },
  { value: 'text-[#ff6b35]', label: 'Orange (#ff6b35)' },
  { value: 'text-[#d4e4d8]', label: 'Light Green' },
];

// Default content matching the current hardcoded AboutUsPage
export const DEFAULT_ABOUT_US_CONTENT: AboutUsContent = {
  heroEn: [
    { text: 'To Share ', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-black' },
    { text: 'Creativity', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-[#ff6b35]' },
    { text: ',', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-black' },
    { text: '\n', fontSize: 'text-base', fontWeight: 'font-normal', color: 'text-black' },
    { text: 'To Inspire ', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-black' },
    { text: 'SCLS Pride', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-[#ff6b35]' },
    { text: ',', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-black' },
    { text: '\n', fontSize: 'text-base', fontWeight: 'font-normal', color: 'text-black' },
    { text: 'To Foster ', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-black' },
    { text: 'Community', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-[#ff6b35]' },
    { text: '.', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-black' },
  ],
  heroCn: [
    { text: '弘扬', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-black' },
    { text: '校风', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-[#ff6b35]' },
    { text: '；', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-black' },
    { text: '\n', fontSize: 'text-base', fontWeight: 'font-normal', color: 'text-black' },
    { text: '激发', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-black' },
    { text: '创新', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-[#ff6b35]' },
    { text: '；', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-black' },
    { text: '\n', fontSize: 'text-base', fontWeight: 'font-normal', color: 'text-black' },
    { text: '泽被', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-black' },
    { text: '四方', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-[#ff6b35]' },
    { text: '。', fontSize: 'text-4xl md:text-5xl', fontWeight: 'font-normal', color: 'text-black' },
  ],
  sections: [
    {
      id: 'proceeds',
      titleEn: 'Where the Proceeds Go?',
      titleCn: '收益去向',
      titleColor: 'text-gray-800',
      titleSize: 'text-4xl',
      paragraphsEn: [
        { text: 'Our efforts are dedicated to supporting others. After covering the essential expenses required to operate the shop, 100% of our proceeds are donated to meaningful causes, ensuring that every purchase helps create a positive impact beyond our school community.', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-700' },
        { text: 'Every six months, we will publicly disclose the income and expenditure records on our website, along with the allocation of the proceeds. Once our partner organization is confirmed, the name of the charity will be announced on the website.', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-700' },
      ],
      paragraphsCn: [
        { text: '我们的努力旨在支持他人。收益中的一部分用于保证商店基本运行，剩下的所有收益100%将捐赠给有意义的公益事业。确保每一笔消费都能为我们学校社区以外的社会产生积极影响。', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-700' },
        { text: '每半年我们将在网站上公布半年的收支记录，以及所得收益的去向。合作机构确定后，我们会将机构名称在网站上公布。', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-700' },
      ],
    },
    {
      id: 'how-to-buy',
      titleEn: 'How to Buy?',
      titleCn: '如何购买？',
      titleColor: 'text-gray-800',
      titleSize: 'text-4xl',
      paragraphsEn: [
        { text: 'This website only supports pre-orders, where you can preview product details including effect images, sizes, and materials, and also access official pre-purchase customer service.', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-700' },
        { text: 'To complete your purchase, simply add your desired items to the cart and submit your reservation online. Once your order number is generated, please connect with our team members offline. Payments can be made via WeChat Pay or cash at our designated redemption point. All pre-ordered products will be available for offline collection.', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-700' },
        { text: 'Purchases are limited to current students and staff; account registration requires a school email.', fontSize: 'text-lg', fontWeight: 'font-black', color: 'text-black' },
        { text: 'Products will be updated regularly on the website, so please follow our latest announcements.', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-700' },
      ],
      paragraphsCn: [
        { text: '本网站仅支持预订，您可以预览商品详情，包括效果图、尺寸和材质等信息，也可以访问官方售前客服。', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-700' },
        { text: '完成购买只需将心仪商品加入购物车并在线提交预约。生成订单号后，请线下联系我们的团队成员。付款方式支持微信支付或现金，在指定兑换点完成支付。所有预订商品均可线下领取。', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-700' },
        { text: '购买仅限在校学生和教职人员，注册账号需使用学校邮箱。', fontSize: 'text-lg', fontWeight: 'font-black', color: 'text-black' },
        { text: '商品将在网站上定期更新，请关注我们的最新公告。', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-700' },
      ],
    },
    {
      id: 'team',
      titleEn: 'Meet our team!',
      titleCn: '认识我们的团队！',
      titleColor: 'text-[#ff6b35]',
      titleSize: 'text-4xl',
      paragraphsEn: [
        { text: 'SCS is part of ArteZone XiaYa Club under the Domestic Division High School Student Council Clubs Department.', fontSize: 'text-lg', fontWeight: 'font-black', color: 'text-black' },
        { text: 'Current Members:\nAilin Han\nAn Hu\nJunyu Ling\nRuomeng Li\n*Names are listed in alphabetical order by first name and have no other significance.', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-800' },
        { text: 'Honored Members:\nFangting Lin\nJiajia Lyu\nKaikun Chen\nLiting Yu\nQixin Zhu\nWeide Dai\nXinyi Wang\nZitong Huang\n*Names are listed in alphabetical order by first name and have no other significance.', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-800' },
        { text: 'Please note that all operations and decisions are student-led, with full supervision by high school teachers from the Domestic Division.', fontSize: 'text-lg', fontWeight: 'font-black', color: 'text-[#ff6b35]' },
        { text: 'Sponsor Teachers:\nLiu Wei (DDHS Teacher), Yuan Yue (DDHS Teacher)', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-[#ff6b35]' },
      ],
      paragraphsCn: [
        { text: 'SCS隶属于中国部高中学生会社团部ArteZone小雅社。', fontSize: 'text-lg', fontWeight: 'font-black', color: 'text-black' },
        { text: '现任成员：\n韩艾霖\n胡安\n灵俊宇\n李若萌\n*姓名按首字母顺序排列，排名不分先后。', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-800' },
        { text: '荣誉成员：\n林芳婷\n吕珈珈\n陈楷焜\n郁立婷\n朱启新\n戴唯德\n王心怡\n黄梓童\n*姓名按首字母顺序排列，排名不分先后。', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-800' },
        { text: '所有的运营与决策均由学生主导，中国部高中老师全程监督。', fontSize: 'text-lg', fontWeight: 'font-black', color: 'text-[#ff6b35]' },
        { text: '审核员：\n刘薇（中部高中教师）袁月（中部高中教师）', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-[#ff6b35]' },
      ],
    },
  ],
  thankYouEn: [
    { text: 'Thank you for supporting SCS.', fontSize: 'text-3xl md:text-4xl lg:text-5xl', fontWeight: 'font-normal', color: 'text-white' },
    { text: 'Together, we build a ', fontSize: 'text-3xl md:text-4xl lg:text-5xl', fontWeight: 'font-normal', color: 'text-white' },
    { text: 'stronger', fontSize: 'text-3xl md:text-4xl lg:text-5xl', fontWeight: 'font-normal', color: 'text-[#ff6b35]' },
    { text: ',', fontSize: 'text-3xl md:text-4xl lg:text-5xl', fontWeight: 'font-normal', color: 'text-white' },
    { text: '\n', fontSize: 'text-base', fontWeight: 'font-normal', color: 'text-white' },
    { text: 'more ', fontSize: 'text-3xl md:text-4xl lg:text-5xl', fontWeight: 'font-normal', color: 'text-white' },
    { text: 'connected', fontSize: 'text-3xl md:text-4xl lg:text-5xl', fontWeight: 'font-normal', color: 'text-[#ff6b35]' },
    { text: ' community!', fontSize: 'text-3xl md:text-4xl lg:text-5xl', fontWeight: 'font-normal', color: 'text-white' },
  ],
  thankYouCn: [
    { text: '感谢您支持 SCS！', fontSize: 'text-3xl md:text-4xl lg:text-5xl', fontWeight: 'font-normal', color: 'text-white' },
    { text: '\n', fontSize: 'text-base', fontWeight: 'font-normal', color: 'text-white' },
    { text: '让我们携手共建一个 ', fontSize: 'text-3xl md:text-4xl lg:text-5xl', fontWeight: 'font-normal', color: 'text-white' },
    { text: '更强大', fontSize: 'text-3xl md:text-4xl lg:text-5xl', fontWeight: 'font-normal', color: 'text-[#ff6b35]' },
    { text: '\n', fontSize: 'text-base', fontWeight: 'font-normal', color: 'text-white' },
    { text: '更紧密', fontSize: 'text-3xl md:text-4xl lg:text-5xl', fontWeight: 'font-normal', color: 'text-[#ff6b35]' },
    { text: ' 的社区！', fontSize: 'text-3xl md:text-4xl lg:text-5xl', fontWeight: 'font-normal', color: 'text-white' },
  ],
};

/**
 * 段落编辑器组件 - 编辑单个文本块
 */
function TextBlockEditor({
  block,
  index,
  onChange,
  onRemove,
}: {
  block: AboutUsTextBlock;
  index: number;
  onChange: (updated: AboutUsTextBlock) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">Paragraph {index + 1}</span>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>
      <Textarea
        value={block.text}
        onChange={(e) => onChange({ ...block, text: e.target.value })}
        className="min-h-[80px] text-sm"
        placeholder="Enter text content..."
      />
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-gray-500">Font Size</Label>
          <Select value={block.fontSize} onValueChange={(v) => onChange({ ...block, fontSize: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {getFontSizeOptions(block.fontSize).map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-gray-500">Font Weight</Label>
          <Select value={block.fontWeight} onValueChange={(v) => onChange({ ...block, fontWeight: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHTS.map((w) => (
                <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-gray-500">Color</Label>
          <Select value={block.color} onValueChange={(v) => onChange({ ...block, color: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLORS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Preview */}
      <div className="border-t pt-2">
        <span className="text-xs text-gray-400">Preview:</span>
        <p className={`${block.fontSize} ${block.fontWeight} ${block.color} mt-1 whitespace-pre-wrap break-words`}>
          {block.text || '(empty)'}
        </p>
      </div>
    </div>
  );
}

/**
 * Section 编辑器 - 编辑一个完整的 section
 */
function SectionEditor({
  section,
  onChange,
  onRemove,
}: {
  section: AboutUsSection;
  onChange: (updated: AboutUsSection) => void;
  onRemove: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'en' | 'cn'>('en');

  const updateParagraph = (lang: 'en' | 'cn', idx: number, block: AboutUsTextBlock) => {
    const key = lang === 'en' ? 'paragraphsEn' : 'paragraphsCn';
    const updated = [...section[key]];
    updated[idx] = block;
    onChange({ ...section, [key]: updated });
  };

  const removeParagraph = (lang: 'en' | 'cn', idx: number) => {
    const key = lang === 'en' ? 'paragraphsEn' : 'paragraphsCn';
    onChange({ ...section, [key]: section[key].filter((_, i) => i !== idx) });
  };

  const addParagraph = (lang: 'en' | 'cn') => {
    const key = lang === 'en' ? 'paragraphsEn' : 'paragraphsCn';
    const newBlock: AboutUsTextBlock = { text: '', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-700' };
    onChange({ ...section, [key]: [...section[key], newBlock] });
  };

  const paragraphs = activeTab === 'en' ? section.paragraphsEn : section.paragraphsCn;

  return (
    <div className="border border-gray-300 rounded-xl p-5 space-y-4 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{section.titleEn} / {section.titleCn}</h3>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="w-4 h-4 text-red-500" />
          <span className="ml-1 text-xs text-red-500">Delete Section</span>
        </Button>
      </div>

      {/* Title editing */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Title (English)</Label>
          <Input value={section.titleEn} onChange={(e) => onChange({ ...section, titleEn: e.target.value })} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Title (中文)</Label>
          <Input value={section.titleCn} onChange={(e) => onChange({ ...section, titleCn: e.target.value })} className="h-8 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Title Size</Label>
            <Select value={section.titleSize} onValueChange={(v) => onChange({ ...section, titleSize: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-64">
              {getFontSizeOptions(section.titleSize).map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Title Color</Label>
          <Select value={section.titleColor} onValueChange={(v) => onChange({ ...section, titleColor: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COLORS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Language tabs */}
      <div className="flex gap-2 border-b pb-2">
        <button
          className={`px-3 py-1 text-sm rounded-t ${activeTab === 'en' ? 'bg-black text-white' : 'text-gray-500'}`}
          onClick={() => setActiveTab('en')}
        >
          English
        </button>
        <button
          className={`px-3 py-1 text-sm rounded-t ${activeTab === 'cn' ? 'bg-black text-white' : 'text-gray-500'}`}
          onClick={() => setActiveTab('cn')}
        >
          中文
        </button>
      </div>

      {/* Paragraphs */}
      <div className="space-y-3">
        {paragraphs.map((block, idx) => (
          <TextBlockEditor
            key={idx}
            block={block}
            index={idx}
            onChange={(updated) => updateParagraph(activeTab, idx, updated)}
            onRemove={() => removeParagraph(activeTab, idx)}
          />
        ))}
        <Button variant="outline" size="sm" onClick={() => addParagraph(activeTab)} className="w-full">
          <Plus className="w-4 h-4 mr-1" /> Add Paragraph
        </Button>
      </div>
    </div>
  );
}

/**
 * About Us 编辑器主组件
 * 管理员可以编辑 About Us 页面的所有内容
 */
export default function AboutUsEditor({
  open,
  onOpenChange,
  content,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: AboutUsContent;
  onSave: (content: AboutUsContent) => Promise<void>;
}) {
  const [editContent, setEditContent] = useState<AboutUsContent>(content);
  const [saving, setSaving] = useState(false);
  const [activeArea, setActiveArea] = useState<'sections' | 'hero' | 'thankyou'>('sections');

  useEffect(() => {
    if (open) {
      setEditContent(JSON.parse(JSON.stringify(content)));
    }
  }, [open, content]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = sanitizeAboutUsContent(editContent);
      await onSave(payload);
      onOpenChange(false);
      toast.success('About Us 已保存 / Saved successfully');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('保存失败 / Save failed: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (idx: number, updated: AboutUsSection) => {
    const sections = [...editContent.sections];
    sections[idx] = updated;
    setEditContent({ ...editContent, sections });
  };

  const removeSection = (idx: number) => {
    setEditContent({ ...editContent, sections: editContent.sections.filter((_, i) => i !== idx) });
  };

  const addSection = () => {
    const newSection: AboutUsSection = {
      id: `section-${Date.now()}`,
      titleEn: 'New Section',
      titleCn: '新板块',
      titleColor: 'text-gray-800',
      titleSize: 'text-4xl',
      paragraphsEn: [{ text: '', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-700' }],
      paragraphsCn: [{ text: '', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-700' }],
    };
    setEditContent({ ...editContent, sections: [...editContent.sections, newSection] });
  };

  // Hero/ThankYou inline block editors
  const InlineBlocksEditor = ({
    blocks,
    onChange,
    label,
  }: {
    blocks: AboutUsTextBlock[];
    onChange: (blocks: AboutUsTextBlock[]) => void;
    label: string;
  }) => (
    <div className="space-y-3">
      <h3 className="font-bold text-sm text-gray-600">{label}</h3>
      {blocks.map((block, idx) => (
        <div key={idx} className="border border-gray-200 rounded p-3 bg-gray-50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Block {idx + 1}</span>
            <Button variant="ghost" size="sm" onClick={() => onChange(blocks.filter((_, i) => i !== idx))}>
              <Trash2 className="w-3 h-3 text-red-400" />
            </Button>
          </div>
          <Input
            value={block.text}
            onChange={(e) => {
              const updated = [...blocks];
              updated[idx] = { ...block, text: e.target.value };
              onChange(updated);
            }}
            placeholder="Text (use \n for line break)"
            className="h-7 text-xs"
          />
          <div className="grid grid-cols-3 gap-2">
            <Select value={block.fontSize} onValueChange={(v) => {
              const updated = [...blocks];
              updated[idx] = { ...block, fontSize: v };
              onChange(updated);
            }}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">{getFontSizeOptions(block.fontSize).map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={block.fontWeight} onValueChange={(v) => {
              const updated = [...blocks];
              updated[idx] = { ...block, fontWeight: v };
              onChange(updated);
            }}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{FONT_WEIGHTS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={block.color} onValueChange={(v) => {
              const updated = [...blocks];
              updated[idx] = { ...block, color: v };
              onChange(updated);
            }}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{COLORS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={() => onChange([...blocks, { text: '', fontSize: 'text-lg', fontWeight: 'font-normal', color: 'text-gray-700' }])}>
        <Plus className="w-3 h-3 mr-1" /> Add Block
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit About Us Page</DialogTitle>
          <DialogDescription>Modify the content and styling of each section on the About Us page.</DialogDescription>
        </DialogHeader>

        {/* Area selector */}
        <div className="flex gap-2 mb-4">
          {(['sections', 'hero', 'thankyou'] as const).map((area) => (
            <button
              key={area}
              className={`px-4 py-2 text-sm rounded-lg border ${activeArea === area ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300'}`}
              onClick={() => setActiveArea(area)}
            >
              {area === 'sections' ? 'Main Sections' : area === 'hero' ? 'Hero Banner' : 'Thank You'}
            </button>
          ))}
        </div>

        {activeArea === 'sections' && (
          <div className="space-y-6">
            {editContent.sections.map((section, idx) => (
              <SectionEditor
                key={section.id}
                section={section}
                onChange={(updated) => updateSection(idx, updated)}
                onRemove={() => removeSection(idx)}
              />
            ))}
            <Button variant="outline" onClick={addSection} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add New Section
            </Button>
          </div>
        )}

        {activeArea === 'hero' && (
          <div className="space-y-6">
            <InlineBlocksEditor
              label="Hero - English"
              blocks={editContent.heroEn}
              onChange={(blocks) => setEditContent({ ...editContent, heroEn: blocks })}
            />
            <InlineBlocksEditor
              label="Hero - 中文"
              blocks={editContent.heroCn}
              onChange={(blocks) => setEditContent({ ...editContent, heroCn: blocks })}
            />
          </div>
        )}

        {activeArea === 'thankyou' && (
          <div className="space-y-6">
            <InlineBlocksEditor
              label="Thank You - English"
              blocks={editContent.thankYouEn}
              onChange={(blocks) => setEditContent({ ...editContent, thankYouEn: blocks })}
            />
            <InlineBlocksEditor
              label="Thank You - 中文"
              blocks={editContent.thankYouCn}
              onChange={(blocks) => setEditContent({ ...editContent, thankYouCn: blocks })}
            />
          </div>
        )}

        {/* Save/Cancel */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}