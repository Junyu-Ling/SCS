# 图片存放目录 / Images Directory

## 使用说明 / Instructions

请将GitHub仓库 https://github.com/Miyeon-0131/SCS 中的所有图片文件复制到此目录。

Please copy all image files from GitHub repository https://github.com/Miyeon-0131/SCS to this directory.

## 操作步骤 / Steps

### 方法1：手动下载 / Method 1: Manual Download

1. 访问 https://github.com/Miyeon-0131/SCS
2. 找到图片文件夹（如 `images/`, `assets/` 等）
3. 下载所有图片文件
4. 将图片复制到 `/public/images/` 目录

### 方法2：使用Git Clone / Method 2: Using Git Clone

```bash
# 克隆仓库
git clone https://github.com/Miyeon-0131/SCS.git temp-scs

# 复制图片文件到项目
cp -r temp-scs/images/* public/images/
# 或者如果图片在其他文件夹
cp -r temp-scs/*.png public/images/
cp -r temp-scs/*.jpg public/images/

# 删除临时文件夹
rm -rf temp-scs
```

## 文件结构 / File Structure

复制完成后，目录结构应该类似：

After copying, the directory structure should look like:

```
/public/images/
  ├── bg.png
  ├── product-1-1.jpg
  ├── product-1-2.jpg
  ├── product-2-1.jpg
  └── ...
```

## 注意事项 / Notes

- 图片会被直接打包进应用，加载速度更快
- Images will be bundled with the app for faster loading
- 请确保文件名与代码中引用的一致
- Make sure filenames match those referenced in the code
