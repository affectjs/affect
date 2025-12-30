# Runtime Tests

测试运行时引擎的功能，使用 pixelmatch 进行图像比较验证。

## 测试工具

### pixelmatch
用于比较两个图像并检测差异。可以验证图像处理操作是否正确执行。

### 测试工具函数 (`image-utils.ts`)

- `compareImages()` - 比较两个图像，返回差异像素数量
- `getImageDimensions()` - 获取图像尺寸
- `verifyResize()` - 验证图像是否按预期调整大小

## 测试用例

### 图像处理测试

1. **resize 测试** - 验证图像尺寸调整
   - 使用 `verifyResize()` 验证输出尺寸
   - 使用 `getImageDimensions()` 获取实际尺寸

2. **grayscale 测试** - 验证灰度滤镜
   - 使用 `compareImages()` 比较原图和灰度图
   - 验证图像确实发生了变化

3. **crop 测试** - 验证裁剪操作
   - 验证输出图像的尺寸是否正确

4. **rotate 测试** - 验证旋转操作
   - 验证图像被正确旋转

## 运行测试

```bash
# 安装依赖（从项目根目录）
cd /Volumes/ORICO/ws/prj/affectjs/affect
pnpm install

# 运行测试
cd packages/@affectjs/runtime
pnpm test

# 监视模式
pnpm test:watch
```

## 测试资源

测试需要以下资源文件：
- `test/assets/sample-image.jpg` - 测试图像（已下载）
- `test/assets/sample-video.mp4` - 测试视频（可选）

输出文件保存在 `test/assets/output/` 目录，测试后会自动清理。

## 使用 pixelmatch 进行图像比较

pixelmatch 可以：
- 检测两个图像之间的像素级差异
- 计算差异像素数量
- 生成差异图像（可选）
- 设置阈值来控制敏感度

示例：
```typescript
const comparison = await compareImages(image1, image2, 0.1);
if (comparison) {
    console.log(`差异像素: ${comparison.diffPixels}`);
    console.log(`总像素: ${comparison.totalPixels}`);
    console.log(`匹配: ${comparison.match}`);
}
```

