import { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Upload, User, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, callEdgeFunction } from '../../lib/supabaseClient';
import { useProfile } from '../contexts/ProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const CLASSES = [
  '高一（1）班', '高一（2）班',
  '高二（1）班', '高二（2）班',
  '高三（1）班', '高三（2）班',
];

const profileSchema = z.object({
  username: z.string().min(2, { message: '用户名至少2个字符' }),
  realName: z.string().min(2, { message: '真实姓名至少2个字符' }),
  className: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, profile, refreshProfile, profileVersion } = useProfile();
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null); // 临时预览头像
  const [tempAvatarData, setTempAvatarData] = useState<string | null>(null); // 临时头像数据
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化头像 URL，并在 profileVersion 变化时更新
  useEffect(() => {
    console.log('[ProfilePage] Avatar update triggered:', {
      profileAvatarUrl: profile?.avatar_url,
      userMetadataAvatarUrl: user?.user_metadata?.avatar_url,
      profileVersion
    });
    
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
      console.log('[ProfilePage] Using profile avatar_url');
    } else if (user?.user_metadata?.avatar_url) {
      setAvatarUrl(user.user_metadata.avatar_url);
      console.log('[ProfilePage] Using user_metadata avatar_url');
    } else {
      console.log('[ProfilePage] No avatar URL found');
    }
    
    // 清除临时预览
    setTempAvatarUrl(null);
    setTempAvatarData(null);
  }, [profile?.avatar_url, user?.user_metadata?.avatar_url, profileVersion]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile?.username || '',
      realName: profile?.real_name || '',
      className: profile?.class_name || '',
    },
    values: { // Update form when profile loads
      username: profile?.username || '',
      realName: profile?.real_name || '',
      className: profile?.class_name || '',
    }
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      
      const file = event.target.files[0];
      
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        toast.error(t('Please select an image file', '请选择图片文件'));
        return;
      }
      
      // 验证文件大小（最大 5MB）
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('Image too large (max 5MB)', '图片太大（最大 5MB）'));
        return;
      }

      setIsUploading(true);
      console.log('[AVATAR] Reading file for preview...');

      // 将图片转换为 Base64 字符串，仅用于预览
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const base64String = reader.result as string;
          console.log('[AVATAR] Image converted to Base64 for preview, length:', base64String.length);
          
          // 仅设置临时预览，不保存
          setTempAvatarUrl(base64String);
          setTempAvatarData(base64String);
          console.log('[AVATAR] Temporary preview set');
          
          toast.info(t('Avatar selected, please click "Save" to apply', '头像已选择，请点击"保存更改"以应用'));
          
        } catch (error) {
          console.error('[AVATAR] Preview error:', error);
          toast.error(t('Preview failed', '预览失败'));
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        console.error('[AVATAR] FileReader error');
        toast.error(t('Failed to read file', '读取文件失败'));
        setIsUploading(false);
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('[AVATAR] Unexpected error:', error);
      toast.error(t('An error occurred', '发生未知错误'));
      setIsUploading(false);
    } finally {
      // Clear input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true);
    try {
      const updateData: any = {
        username: data.username,
        real_name: data.realName,
      };
      
      // 如果是学生，添加班级信息
      if (data.className) {
        updateData.class_name = data.className;
      } else {
        // 如果是老师，清除班级信息
        updateData.class_name = undefined;
      }

      // 如果有临时头像数据，上传到 Storage
      if (tempAvatarData) {
        console.log('[AVATAR] 🎯 Uploading avatar to Storage...');
        
        try {
          // 将 Base64 转换为 Blob
          const base64Data = tempAvatarData.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/jpeg' });
          
          console.log(`[AVATAR] Blob size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

          // 生成文件名
          const fileName = `avatar-${user?.id}-${Date.now()}.jpg`;
          const filePath = `avatars/${fileName}`;

          console.log(`[AVATAR] 🚀 Uploading ${fileName} to Storage...`);

          // 直接上传到 Supabase Storage
          const { data, error } = await supabase.storage
            .from('make-c4f5ade4-images')
            .upload(filePath, blob, {
              contentType: 'image/jpeg',
              upsert: false
            });

          if (error) {
            console.error('[AVATAR] ❌ Storage upload error:', error);
            toast.error(t('Avatar upload failed', '头像上传失败'));
            setIsSaving(false);
            return;
          }

          // 获取公开 URL
          const { data: urlData } = supabase.storage
            .from('make-c4f5ade4-images')
            .getPublicUrl(filePath);

          console.log('[AVATAR] ✅ Avatar uploaded successfully:', urlData.publicUrl);
          
          // 使用 Storage URL 而不是 Base64
          updateData.avatar_url = urlData.publicUrl;
          
          // 更新 localStorage 中的 URL（用于快速加载）
          const avatarKey = `avatar_${user?.id}`;
          localStorage.setItem(avatarKey, urlData.publicUrl);
          console.log('[AVATAR] Saved Storage URL to localStorage');
          
        } catch (uploadError) {
          console.error('[AVATAR] Upload error:', uploadError);
          toast.error(t('Avatar upload failed', '头像上传失败'));
          setIsSaving(false);
          return;
        }
      }

      const { error } = await supabase.auth.updateUser({
        data: updateData
      });

      if (error) {
        toast.error(t('Save failed: ', '保存失败: ') + error.message);
      } else {
        toast.success(t('Profile updated successfully', '个人资料已更新'));
        
        // 清除临时头像数据
        setTempAvatarUrl(null);
        setTempAvatarData(null);
        
        // 刷新 profile context
        await refreshProfile();
      }
    } catch (error) {
      console.error(error);
      toast.error(t('Error occurred while saving', '保存时发生错误'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{t('Please log in to view profile', '请先登录查看个人资料')}</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{t('Profile Settings', '个人设置')}</CardTitle>
          <CardDescription>{t('Manage your personal information and account settings', '管理您的个人信息和账号设置')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <Avatar className="h-24 w-24 border-2 border-border group-hover:border-primary transition-colors">
                <AvatarImage src={tempAvatarUrl || avatarUrl || undefined} />
                <AvatarFallback className="text-2xl bg-muted">
                  {profile?.real_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="h-6 w-6" />
              </div>
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">{t('Click avatar to upload new image', '点击头像上传新图片')}</p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>
          </div>

          <Separator />

          {/* Form Section */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('Email (read-only)', '邮箱 (不可修改)')}</Label>
              <Input id="email" value={user.email} disabled className="bg-muted" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">{t('Username', '用户名')}</Label>
                <Input 
                  id="username" 
                  {...register('username')} 
                  placeholder={t('Enter username', '请输入用户名')} 
                />
                {errors.username && (
                  <p className="text-xs text-red-500">{errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="realName">{t('Real Name', '真实姓名')}</Label>
                <Input 
                  id="realName" 
                  {...register('realName')} 
                  placeholder={t('Enter real name', '请输入真实姓名')} 
                />
                {errors.realName && (
                  <p className="text-xs text-red-500">{errors.realName.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">{t('Role (read-only)', '身份 (不可修改)')}</Label>
                <div className="flex items-center space-x-2 h-10 px-3 rounded-md border bg-muted text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>
                    {profile?.role === 'teacher' ? t('Teacher', '老师') : profile?.role === 'admin' ? t('Admin', '管理员') : t('Student', '学生')}
                  </span>
                </div>
              </div>
              {profile?.role === 'student' && (
                <div className="space-y-2">
                  <Label htmlFor="className">{t('Class', '班级')}</Label>
                  <Controller
                    name="className"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('Select class', '请选择班级')} />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASSES.map((cls) => (
                            <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.className && (
                    <p className="text-xs text-red-500">{errors.className.message}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {t('Save Changes', '保存更改')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}